-- Function to safely submit a member entry (Idempotent)
-- Returns the member record (either newly inserted or existing)

-- DROP OLD SIGNATURES
DROP FUNCTION IF EXISTS submit_member_entry(uuid, text, text, text, text, timestamptz, text, text, boolean, timestamptz, text[]);
DROP FUNCTION IF EXISTS submit_member_entry(uuid, text, text, text, text, timestamptz, text, text, boolean, timestamptz, jsonb);

CREATE OR REPLACE FUNCTION submit_member_entry(
  _id text,
  _name text,
  _category text,
  _phone text,
  _status text,
  _check_in_time timestamptz,
  _gender text,
  _residency text,
  _born_again boolean,
  _joined_date timestamptz,
  _attended_service_ids jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  action text := 'INSERT';
  match_reason text := 'NEW_RECORD';
BEGIN
  -- 0. Business Logic Deduplication: Check Name (Case Insensitive) + Phone (Last 9 digits) + Residence
  -- If this person exists, we reuse their record instead of creating a new one.
  -- Use REGEXP_REPLACE to normalize all whitespace (tabs, newlines, multiple spaces) to single space
  -- and COALESCE to handle NULLs.
  SELECT * INTO result FROM public.members 
  WHERE TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g')) ILIKE TRIM(REGEXP_REPLACE(_name, '\s+', ' ', 'g')) 
    AND RIGHT(TRIM(phone), 9) = RIGHT(TRIM(_phone), 9)
    AND COALESCE(TRIM(REGEXP_REPLACE(residency, '\s+', ' ', 'g')), '') ILIKE COALESCE(TRIM(REGEXP_REPLACE(_residency, '\s+', ' ', 'g')), '')
  LIMIT 1;

  IF result IS NOT NULL THEN
     target_id := result.id; -- Lock onto the existing ID
     action := 'MERGE';
     match_reason := 'NAME_PHONE_RESIDENCY_MATCH';

     -- AUTO-UPGRADE: If they were a First Timer, they are now a Member (returning visitor)
     IF result.category = 'First Timer' THEN
       UPDATE public.members SET category = 'Member' WHERE id = target_id;
       -- Update the result variable to reflect the change for the return value
       result.category := 'Member'; 
     END IF;
  ELSE
      -- 1. Insert New (Idempotent)
      INSERT INTO public.members (
        id, name, category, phone, status, 
        check_in_time, gender, residency, born_again, joined_date, attended_service_ids
      )
      VALUES (
        target_id, _name, _category, _phone, _status, 
        _check_in_time, _gender, _residency, _born_again, _joined_date, _attended_service_ids
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING * INTO result;

      -- 2. If result is null (ID conflict), fetch existing
      IF result IS NULL THEN
        SELECT * INTO result FROM public.members WHERE id = target_id;
        action := 'MERGE';
        match_reason := 'ID_CONFLICT_RECOVERED';
      END IF;
  END IF;

  -- 3. ATTENDANCE LOGIC: If service IDs are provided, ensure they are checked in.
  -- This guarantees atomic "Register + Check In"
  IF _attended_service_ids IS NOT NULL AND jsonb_array_length(_attended_service_ids) > 0 THEN
    INSERT INTO public.service_attendance (member_id, service_id, check_in_time)
    SELECT 
      target_id, -- Use target_id which is either new or existing
      value, 
      _check_in_time
    FROM jsonb_array_elements_text(_attended_service_ids)
    ON CONFLICT (member_id, service_id) DO NOTHING;
  END IF;

  -- 4. Return the result with Metadata
  RETURN to_jsonb(result) || jsonb_build_object('_meta', jsonb_build_object('action', action, 'match_reason', match_reason));
END;
$$;
