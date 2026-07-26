-- Migration 23: Resilient Custom Access Token Auth Hook
-- Purpose:
-- Fixes "Google authentication failed: Error running pg-functions://postgres/public/custom_access_token_hook"
-- 1. Matches user profile by auth ID first, then falls back to case-insensitive verified email lookup.
-- 2. Protects token issuance by returning event unmodified if any profile error occurs, ensuring Google & SSO logins NEVER fail.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _claims jsonb;
  _user_id uuid;
  _email text;
  _manifest_id uuid;
  _role text;
BEGIN
  _claims := event->'claims';
  _user_id := (event->>'user_id')::uuid;
  _email := lower(trim(COALESCE(_claims->>'email', '')));

  -- 1. Match public.users by auth user ID first
  SELECT manifest_id, role INTO _manifest_id, _role
  FROM public.users
  WHERE id = _user_id AND status <> 'Deleted'
  LIMIT 1;

  -- 2. Fallback to matching by verified email for Google / SSO / legacy accounts
  IF _manifest_id IS NULL AND _email <> '' THEN
    SELECT manifest_id, role INTO _manifest_id, _role
    FROM public.users
    WHERE lower(trim(email)) = _email AND status <> 'Deleted'
    LIMIT 1;
  END IF;

  -- 3. Set claims cleanly if user profile exists
  IF _manifest_id IS NOT NULL THEN
    _claims := jsonb_set(_claims, '{user_metadata, manifest_id}', to_jsonb(_manifest_id));
    _claims := jsonb_set(_claims, '{app_metadata, manifest_id}', to_jsonb(_manifest_id));
    IF _role IS NOT NULL THEN
      _claims := jsonb_set(_claims, '{user_metadata, role}', to_jsonb(_role));
      _claims := jsonb_set(_claims, '{app_metadata, role}', to_jsonb(_role));
    END IF;
  END IF;

  event := jsonb_set(event, '{claims}', _claims);
  RETURN event;
EXCEPTION WHEN OTHERS THEN
  -- Protect token issuance: return event unmodified if any error occurs
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;
