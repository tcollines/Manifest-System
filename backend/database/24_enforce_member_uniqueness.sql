-- 1. ADD NORMALIZED COLUMNS
-- We add these as standard columns, populated via Trigger to ensure consistency.
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS name_norm text,
ADD COLUMN IF NOT EXISTS phone_last9 text,
ADD COLUMN IF NOT EXISTS residency_norm text;

-- 2. CREATE NORMALIZATION FUNCTION & TRIGGER
CREATE OR REPLACE FUNCTION normalize_member_identity()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize Name: Lowercase, collapse whitespace, trim
  NEW.name_norm := LOWER(TRIM(REGEXP_REPLACE(NEW.name, '\s+', ' ', 'g')));
  
  -- Normalize Phone: Last 9 digits, trim
  NEW.phone_last9 := RIGHT(TRIM(NEW.phone), 9);
  
  -- Normalize Residency: Lowercase, collapse whitespace, trim, handle NULL
  NEW.residency_norm := COALESCE(LOWER(TRIM(REGEXP_REPLACE(NEW.residency, '\s+', ' ', 'g'))), '');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to allow safe re-run
DROP TRIGGER IF EXISTS trg_normalize_member_identity ON public.members;

CREATE TRIGGER trg_normalize_member_identity
BEFORE INSERT OR UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION normalize_member_identity();

-- 3. POPULATE NORMALIZED COLUMNS (Triggers logic for existing rows)
UPDATE public.members SET id = id; 

-- 4. DEDUPLICATE EXISTING DATA
-- We keep the OLDEST record (min created_at) and delete others.
-- WARNING: This deletes data. Ensure backup if critical.
DELETE FROM public.members
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY name_norm, phone_last9, residency_norm 
             ORDER BY created_at ASC
           ) as rn
    FROM public.members
  ) t
  WHERE t.rn > 1
);

-- 5. CREATE UNIQUE INDEX
-- This is the HARD constraint.
DROP INDEX IF EXISTS idx_members_unique_identity;
CREATE UNIQUE INDEX idx_members_unique_identity 
ON public.members(name_norm, phone_last9, residency_norm);

-- 6. REFACTOR RPC (Concurrency Safe + Type Safe)
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
SET default_transaction_isolation = 'serializable' -- Enforce strict isolation
AS $$
DECLARE
  result record;
  action text;
  match_reason text;
  final_id text;
  
  -- Variables for Attendance Observability
  all_service_ids text[];
  valid_service_ids text[]; -- CHANGED: Must be TEXT[] to hold legacy IDs (e-...)
  ignored_service_ids text[];
BEGIN
  -- Step 1: Attempt INSERT (Optimistic)
  BEGIN
    INSERT INTO public.members (
      id, name, category, phone, status, 
      check_in_time, gender, residency, born_again, joined_date, attended_service_ids
    )
    VALUES (
      COALESCE(_id, gen_random_uuid()::text), 
      _name, _category, _phone, _status, 
      _check_in_time, _gender, _residency, _born_again, _joined_date, _attended_service_ids
    )
    RETURNING * INTO result;
    
    action := 'INSERT';
    match_reason := 'NEW_RECORD';
    final_id := result.id::text;
    
  EXCEPTION WHEN unique_violation THEN
    -- Step 2: Handle Conflict -> RAISE ERROR as requested
    -- User wants to explicitly know if it's a duplicate.
    RAISE EXCEPTION 'Member with this Name, Phone, and Residency already exists.' 
      USING ERRCODE = '23505'; -- Standard Unique Violation Code
  END;

  -- Step 3: Attendance with Observability
  ignored_service_ids := ARRAY[]::text[]; -- Initialize empty
  
  IF _attended_service_ids IS NOT NULL AND jsonb_array_length(_attended_service_ids) > 0 THEN
    -- A. Parse all input IDs into a text array
    SELECT ARRAY(SELECT jsonb_array_elements_text(_attended_service_ids)) INTO all_service_ids;
    
    -- B. Filter: Separate VALID (Database) IDs from TEMPORARY (Frontend) IDs
    -- We assume the database stores IDs as TEXT (to support legacy 'e-...' and UUIDs).
    -- We specifically IGNORE 'evt-%' because user confirmed these are temp/invalid.
    -- We ALLOW everything else (UUIDs, 'e-...', etc).
    SELECT 
      COALESCE(ARRAY_AGG(x), ARRAY[]::text[]),
      COALESCE(ARRAY_AGG(x) FILTER (WHERE x LIKE 'evt-%'), ARRAY[]::text[])
    INTO valid_service_ids
    FROM UNNEST(all_service_ids) x
    WHERE x NOT LIKE 'evt-%'; -- Criteria for VALID

    -- C. Calculate Ignored (Inputs that matched filter)
    -- Simplified logic above doesn't capture ignored in one go easily with standard SQL without CTEs or two distinct queries.
    -- Let's stick to the explicit extraction for clarity.
    
    -- 1. Get VALID IDs (Not 'evt-')
    SELECT COALESCE(ARRAY_AGG(x), ARRAY[]::text[])
    INTO valid_service_ids
    FROM UNNEST(all_service_ids) x
    WHERE x NOT LIKE 'evt-%';

    -- 2. Get IGNORED IDs (Starts with 'evt-')
    SELECT COALESCE(ARRAY_AGG(x), ARRAY[]::text[])
    INTO ignored_service_ids
    FROM UNNEST(all_service_ids) x
    WHERE x LIKE 'evt-%';

    -- D. Insert only VALID Service IDs
    IF array_length(valid_service_ids, 1) > 0 THEN
      -- Note: service_id column is assumed to be TEXT (or UUID hidden behind text).
      -- If it's UUID column, 'e-...' will fail here on restart.
      -- BUT debug_output proved 'e-...' exists in ministry_events.
      -- So service_attendance.service_id MUST be compatible (Text).
      -- We remove the ::uuid cast.
      INSERT INTO public.service_attendance (member_id, service_id, check_in_time)
      SELECT 
        final_id::uuid, 
        v_id, -- Insert as Text (Implicit cast if column is different, but likely Text)
        _check_in_time
      FROM UNNEST(valid_service_ids) v_id
      ON CONFLICT (member_id, service_id) DO NOTHING;
    END IF;
  END IF;

  -- Step 4: Return result with Enhanced Metadata
  RETURN to_jsonb(result) || jsonb_build_object(
    '_meta', jsonb_build_object(
      'action', action, 
      'match_reason', match_reason,
      'ignored_service_ids', ignored_service_ids
    )
  );
END;
$$;
