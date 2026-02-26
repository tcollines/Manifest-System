
-- 65_restore_first_timer_logic.sql
-- Restore the missing logic to set first_timer_service_id during member creation.
-- This was seemingly lost during the Phase 3B RPC alignment.

BEGIN;

CREATE OR REPLACE FUNCTION submit_member_entry(
  _id uuid,               -- Native UUID primary key
  _legacy_id text,        -- Historical TEXT identifier
  _name text,
  _category text,
  _phone text,
  _status text,
  _check_in_time timestamptz,
  _gender text,
  _residency text,
  _born_again boolean,
  _joined_date timestamptz,
  _attended_service_ids jsonb,
  _current_service_id uuid DEFAULT NULL,
  _legacy_current_service_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_id uuid := COALESCE(_id, gen_random_uuid());
  result record;
  action text := 'INSERT';
  match_reason text := 'NEW_RECORD';
  
  -- New variables for First Timer check
  v_first_timer_date date := NULL;
  v_is_first_timer boolean := false;
  v_first_timer_service_id uuid := NULL;
BEGIN
  -- 0. Business Logic Deduplication (Check by Name + Phone)
  SELECT * INTO result FROM public.members 
  WHERE TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g')) ILIKE TRIM(REGEXP_REPLACE(_name, '\s+', ' ', 'g')) 
    AND RIGHT(TRIM(phone), 9) = RIGHT(TRIM(_phone), 9)
    AND COALESCE(TRIM(REGEXP_REPLACE(residency, '\s+', ' ', 'g')), '') ILIKE COALESCE(TRIM(REGEXP_REPLACE(_residency, '\s+', ' ', 'g')), '')
  LIMIT 1;

  IF result IS NOT NULL THEN
     target_id := result.id; 
     action := 'MERGE';
     match_reason := 'NAME_PHONE_RESIDENCY_MATCH';

     -- AUTO-UPGRADE Category
     IF result.category = 'First Timer' THEN
       UPDATE public.members SET category = 'Member' WHERE id = target_id;
       result.category := 'Member'; 
     END IF;
  ELSE
      -- 1. Insert New (Authoritative UUID graph)
      
      -- RESTORED LOGIC: Set First Timer fields
      IF _category = 'First Timer' THEN
           v_is_first_timer := true;
           v_first_timer_date := COALESCE(_check_in_time::date, NOW()::date);
           v_first_timer_service_id := _current_service_id;
      ELSE
           v_is_first_timer := false;
      END IF;

      INSERT INTO public.members (
        id, legacy_id, name, category, phone, status, 
        check_in_time, gender, residency, born_again, joined_date, attended_service_ids,
        -- RESTORED COLUMNS
        is_first_timer, first_timer_date, first_timer_service_id
      )
      VALUES (
        target_id, _legacy_id, _name, _category, _phone, _status, 
        _check_in_time, _gender, _residency, _born_again, _joined_date, _attended_service_ids,
        -- RESTORED VALUES
        v_is_first_timer, v_first_timer_date, v_first_timer_service_id
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING * INTO result;

      IF result IS NULL THEN
        SELECT * INTO result FROM public.members WHERE id = target_id;
        action := 'MERGE';
        match_reason := 'ID_CONFLICT_RECOVERED';
      END IF;
  END IF;

  -- 2. ATTENDANCE SYNC
  IF _attended_service_ids IS NOT NULL AND jsonb_array_length(_attended_service_ids) > 0 THEN
    INSERT INTO public.service_attendance (member_id, legacy_member_id, service_id, legacy_service_id, check_in_time)
    SELECT 
      target_id,
      _legacy_id,
      CASE WHEN value ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN value::uuid ELSE NULL END,
      value,
      _check_in_time
    FROM jsonb_array_elements_text(_attended_service_ids)
    ON CONFLICT (member_id, service_id) DO NOTHING;
  END IF;

  RETURN to_jsonb(result) || jsonb_build_object('_meta', jsonb_build_object('action', action, 'match_reason', match_reason));
END;
$$;

COMMIT;
