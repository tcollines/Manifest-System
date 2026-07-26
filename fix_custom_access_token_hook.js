const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from backend/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const sqlFix = `
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

  -- 1. Try matching public.users by auth user ID first
  SELECT manifest_id, role INTO _manifest_id, _role
  FROM public.users
  WHERE id = _user_id AND status <> 'Deleted'
  LIMIT 1;

  -- 2. Fallback to matching by verified email for Google / legacy accounts
  IF _manifest_id IS NULL AND _email <> '' THEN
    SELECT manifest_id, role INTO _manifest_id, _role
    FROM public.users
    WHERE lower(trim(email)) = _email AND status <> 'Deleted'
    LIMIT 1;
  END IF;

  -- 3. Set claims cleanly if user profile was found
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
`;

async function applyFix() {
  console.log("Applying resilient custom_access_token_hook definition to Supabase...");
  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql: sqlFix });
    if (error) {
      console.log("RPC returned error:", error.message);
      console.log("\nSQL TO RUN IN SUPABASE SQL EDITOR:\n");
      console.log(sqlFix);
    } else {
      console.log("✅ Successfully updated custom_access_token_hook!");
    }
  } catch (e) {
    console.log("Exception:", e.message);
    console.log("\nSQL TO RUN IN SUPABASE SQL EDITOR:\n");
    console.log(sqlFix);
  }
}

applyFix();
