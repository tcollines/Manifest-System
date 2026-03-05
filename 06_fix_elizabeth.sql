-- Fix Misaligned Google SSO Identity for Elizabeth
-- Run this in the Supabase SQL Editor

DO $$
DECLARE
    target_email TEXT := 'elizabethabuo23@gmail.com';
    db_uid UUID;
    tenant_id UUID;
    auth_uid UUID;
BEGIN
    -- 1. Find the user in public.users
    SELECT id, manifest_id INTO db_uid, tenant_id
    FROM public.users
    WHERE email ILIKE target_email;

    IF db_uid IS NULL THEN
        RAISE NOTICE 'User % not found in public.users', target_email;
        RETURN;
    END IF;

    -- 2. Check if a misaligned GoTrue identity already exists
    SELECT id INTO auth_uid
    FROM auth.users
    WHERE email ILIKE target_email;

    -- 3. If a GoTrue identity exists but IDs don't match, we must align public.users to the Auth ID
    -- Wait, if we change public.users.id, foreign keys might break.
    -- Alternatively, we can insert the GoTrue user using the public.users ID directly into auth.users!
    -- Yes, direct INSERT bypasses the API layer and auto-triggers if we are careful, 
    -- but creating auth.users manually requires hashing passwords.
    
    -- Actually, if we just temporarily disable the trigger on public.users, or handle it via upsert?
    -- The easiest way to fix a single user's Google Login is to strip them from auth.users (if any)
    -- and insert them directly into auth.users.
    
    IF auth_uid IS NOT NULL AND auth_uid != db_uid THEN
        -- Delete the wrong auth identity
        DELETE FROM auth.users WHERE id = auth_uid;
    END IF;

    -- Insert the exact matching identity into auth.users to allow Google to link to it
    -- Note: encrypted_password is empty because they use Google SSO, but GoTrue might require it. 
    -- We'll set a dummy hash or just null if allowed.
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        db_uid,
        'authenticated',
        'authenticated',
        target_email,
        crypt('ManifestReset123!', gen_salt('bf')), -- Dummy password fallback
        now(),
        jsonb_build_object('provider', 'email', 'providers', array['email', 'google'], 'manifest_id', tenant_id),
        '{}'::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT (id) DO UPDATE SET 
        raw_app_meta_data = EXCLUDED.raw_app_meta_data,
        email_confirmed_at = now();

    -- Also insert into auth.identities to ensure Google SSO binds correctly
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = db_uid AND provider = 'email') THEN
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(),
            db_uid,
            jsonb_build_object('sub', db_uid, 'email', target_email),
            'email',
            now(),
            now(),
            now()
        );
    END IF;

    RAISE NOTICE 'Alignment successful for % with ID %', target_email, db_uid;
END;
$$;
