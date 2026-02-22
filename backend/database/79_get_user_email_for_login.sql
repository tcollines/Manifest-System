CREATE OR REPLACE FUNCTION public.get_user_email_for_login(p_input TEXT DEFAULT NULL, p_username TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_email TEXT;
    v_search TEXT;
BEGIN
    v_search := COALESCE(TRIM(p_input), TRIM(p_username));
    
    -- 1. Check if it matches a username or email in public.users
    SELECT au.email INTO v_email
    FROM public.users pu
    JOIN auth.users au ON pu.id = au.id
    WHERE pu.username = v_search OR pu.email = v_search
    LIMIT 1;

    -- 2. If no match in public.users, check auth.users email directly
    IF v_email IS NULL THEN
        SELECT email INTO v_email
        FROM auth.users
        WHERE email = v_search
        LIMIT 1;
    END IF;

    RETURN v_email;
END;
$$;

-- Grant execute permissions to API roles so PostgREST can see it
GRANT EXECUTE ON FUNCTION public.get_user_email_for_login(TEXT, TEXT) TO anon, authenticated, service_role;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
