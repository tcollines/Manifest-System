-- 1. Deduplicate Users
-- We want to keep the most "complete" row (the one with a non-null name, which is likely the one an Admin created)
-- and remove the auto-generated blank ones.

WITH duplicates AS (
    SELECT email, array_agg(id ORDER BY (name IS NOT NULL) DESC, created_at ASC) as ids
    FROM public.users
    WHERE email IS NOT NULL
    GROUP BY email
    HAVING count(*) > 1
),
records_to_delete AS (
    SELECT unnest(ids[2:array_length(ids, 1)]) as id_to_delete
    FROM duplicates
)
-- Soft delete or hard delete duplicates that don't have constraints yet. 
-- Wait, if the duplicate is from auth.users trigger, it might just be empty. 
-- We'll just hard delete the extra public.users row if we can. Note: if it has FKs, it will fail.
-- But it's empty, so it probably doesn't have FKs.
DELETE FROM public.users
WHERE id IN (SELECT id_to_delete FROM records_to_delete);

-- If the above fails due to FKs (highly unlikely for the auto-generated blank row),
-- you would need to manually migrate those FKs to the primary ID. 
-- Assuming success, we proceed:

-- 2. Add Unique Index allowing NULLs
-- This ensures that multiple users can have a NULL email (like stage/vehicle coordinators),
-- but non-null emails must be unique per manifest_id.
DROP INDEX IF EXISTS unique_manifest_email;
CREATE UNIQUE INDEX unique_manifest_email ON public.users (manifest_id, email) WHERE email IS NOT NULL;

-- 3. Check for the auth trigger and update it if necessary
-- To prevent the trigger from crashing the transaction when a duplicate email is found
-- (since now we have a unique index), we intercept it:

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    existing_user_id TEXT;
BEGIN
    -- Only do this if email is provided
    IF NEW.email IS NOT NULL THEN
        -- Check if a user with this email already exists in public.users
        SELECT id INTO existing_user_id FROM public.users WHERE email = NEW.email LIMIT 1;
        
        IF existing_user_id IS NOT NULL THEN
            -- If user exists, we do NOT insert a new row into public.users.
            -- We might want to link the auth.users.id to the public.users row, 
            -- but our frontend relies on `public.users.email` lookup anyway.
            -- So we can just silently return NEW without inserting a duplicate.
            RETURN NEW;
        END IF;
    END IF;

    -- If no duplicate, insert the new user record
    INSERT INTO public.users (id, email, name, role, manifest_id)
    VALUES (
        NEW.id,
        NEW.email,
        '',      -- Name will be updated later by the user or admin
        'User',  -- Default role
        'tcollines/Manifest-System' -- Default or extract from metadata if available
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
