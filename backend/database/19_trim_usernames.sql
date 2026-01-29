
-- 1. Trim whitespace from usernames
-- We use a DO block to handle potential duplicates safely
DO $$
DECLARE
    r RECORD;
    sanitized_name TEXT;
    conflict_check INTEGER;
BEGIN
    FOR r IN SELECT id, username FROM public.users LOOP
        sanitized_name := TRIM(r.username);
        
        -- Only update if trimming actually changes something
        IF sanitized_name <> r.username THEN
            
            -- Check if the sanitized name already exists for ANOTHER user
            SELECT count(*) INTO conflict_check 
            FROM public.users 
            WHERE username = sanitized_name AND id <> r.id;
            
            IF conflict_check > 0 THEN
                -- Conflict found! Append a suffix to avoid uniqueness error or logical duplicates
                -- e.g. "Ben " becomes "Ben_2"
                UPDATE public.users 
                SET username = sanitized_name || '_' || substring(md5(random()::text) from 1 for 3)
                WHERE id = r.id;
            ELSE
                -- No conflict, safe to trim
                UPDATE public.users 
                SET username = sanitized_name 
                WHERE id = r.id;
            END IF;
            
        END IF;
    END LOOP;
END $$;
