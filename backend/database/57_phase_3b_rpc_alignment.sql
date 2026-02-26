
-- 57_phase_3b_rpc_alignment.sql
-- Goal: Align core RPCs with the Native UUID schema (Phase 3B).
-- Fixes: References to id_uuid, service_id_uuid, etc. which were renamed/removed.

BEGIN;

-- 1. Update submit_member_entry
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS submit_member_entry(text, text, text, text, text, timestamptz, text, text, boolean, timestamptz, jsonb);

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
      INSERT INTO public.members (
        id, legacy_id, name, category, phone, status, 
        check_in_time, gender, residency, born_again, joined_date, attended_service_ids
      )
      VALUES (
        target_id, _legacy_id, _name, _category, _phone, _status, 
        _check_in_time, _gender, _residency, _born_again, _joined_date, _attended_service_ids
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


-- 2. Update resolve_event_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_event_id(
    old_id TEXT,
    new_id UUID
) RETURNS JSON AS $$
DECLARE
    v_affected_rows INT := 0;
    v_total_updates INT := 0;
BEGIN
    -- 1. Pickup Stations
    UPDATE pickup_stations 
    SET event_id = new_id,
        legacy_event_id = old_id
    WHERE legacy_event_id = old_id OR event_id::text = old_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;

    -- 2. Service Attendance
    UPDATE service_attendance 
    SET service_id = new_id,
        legacy_service_id = old_id
    WHERE legacy_service_id = old_id OR service_id::text = old_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;

    -- 3. Souls
    UPDATE souls 
    SET event_id = new_id,
        legacy_event_id = old_id
    WHERE legacy_event_id = old_id OR event_id::text = old_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;

    -- 4. Next Gen Souls
    UPDATE next_gen_souls 
    SET service_id = new_id
    -- Note: next_gen_souls might not have legacy_service_id yet, using text casting for safety
    WHERE service_id::text = old_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;

    -- 5. Transactions
    UPDATE transactions 
    SET event_id = new_id
    WHERE event_id::text = old_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;

    -- 6. Personal Vehicles
    UPDATE personal_vehicles
    SET attended_service_ids = array_replace(attended_service_ids, old_id, new_id::text),
        current_service_id = CASE WHEN current_service_id::text = old_id THEN new_id ELSE current_service_id END
    WHERE attended_service_ids @> ARRAY[old_id] OR current_service_id::text = old_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;

    -- 7. Members
    UPDATE members
    SET attended_service_ids = (attended_service_ids - old_id) || jsonb_build_array(new_id::text)
    WHERE attended_service_ids @> jsonb_build_array(old_id);
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;
    
    -- 8. Children
    UPDATE children
    SET attended_service_ids = (attended_service_ids - old_id) || jsonb_build_array(new_id::text)
    WHERE attended_service_ids @> jsonb_build_array(old_id);
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;
    
    -- 9. Users
    UPDATE users
    SET event_id = new_id::text -- users still uses text for event_id for some reason?
    WHERE event_id = old_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    v_total_updates := v_total_updates + v_affected_rows;
    
    RETURN json_build_object(
        'success', true,
        'old_id', old_id,
        'new_id', new_id,
        'total_updates', v_total_updates
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;
