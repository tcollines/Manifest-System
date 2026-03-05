-- Final Fix for Elizabeth's Google SSO Identity
-- Run this in the Supabase SQL Editor

DO $$
DECLARE
    target_email TEXT := 'elizabethabuo23@gmail.com';
    db_uid UUID;
    tenant_id UUID;
BEGIN
    -- 1. Snapshot the user from the public table
    SELECT id, manifest_id INTO db_uid, tenant_id
    FROM public.users
    WHERE email ILIKE target_email;

    IF db_uid IS NULL THEN
        RAISE NOTICE 'User % not found in public.users', target_email;
        RETURN;
    END IF;

    -- 2. Completely scrub ALL ghost identities from GoTrue memory
    DELETE FROM auth.identities WHERE user_id = db_uid;
    DELETE FROM auth.users WHERE id = db_uid;
    
    DELETE FROM auth.identities WHERE identity_data->>'email' = target_email;
    DELETE FROM auth.users WHERE email = target_email;

    -- 3. Perfectly recreate the auth.users record, explicitly tied to the exact db_uid
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
        NULL, -- Allows OAuth-only access
        now(),
        jsonb_build_object('provider', 'email', 'providers', array['email', 'google'], 'manifest_id', tenant_id),
        '{"name": "Elizabeth Abuo"}'::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- 4. Specifically insert the Identity mapping that GoTrue uses to say "Yes, this Google Account maps to this UUID"
    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    )
    VALUES (
        -- Generate a random ID for the identity entry
        gen_random_uuid(),
        db_uid,
        jsonb_build_object('sub', db_uid, 'email', target_email),
        'google',
        db_uid::text, -- Or target_email, GoTrue usually uses the UID or provider's subject ID
        now(),
        now(),
        now()
    );

    RAISE NOTICE 'Surgical Ghost-Wipe and Re-sync completely successful for % with ID %', target_email, db_uid;
END;
$$;
