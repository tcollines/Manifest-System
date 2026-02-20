CREATE OR REPLACE FUNCTION public.get_user_uuid_for_login(p_username TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM public.users WHERE username = p_username LIMIT 1;
    RETURN v_id;
END;
$$;
