CREATE OR REPLACE FUNCTION delete_expired_event_auth_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
BEGIN
    -- Find all users in public.users who no longer have a username or password set 
    -- (meaning they were cleaned up by the eventController but still exist in auth)
    FOR v_user IN 
        SELECT auth_user_id 
        FROM public.users 
        WHERE (status = 'Inactive' OR username IS NULL)
        AND auth_user_id IS NOT NULL
    LOOP
        -- Delete from Supabase Auth explicitly securely
        DELETE FROM auth.users WHERE id = v_user.auth_user_id;
        
        -- Detach the UUID from the public record so it isn't orphaned
        UPDATE public.users 
        SET auth_user_id = NULL 
        WHERE auth_user_id = v_user.auth_user_id;
    END LOOP;
END;
$$;
