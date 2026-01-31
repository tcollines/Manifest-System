-- 1. Schema Changes
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS is_first_timer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS first_timer_date date,
ADD COLUMN IF NOT EXISTS first_timer_service_id text;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_first_timer_requirements') THEN
        ALTER TABLE public.members
        ADD CONSTRAINT check_first_timer_requirements
        CHECK (is_first_timer = false OR (is_first_timer = true AND first_timer_date IS NOT NULL));
    END IF;
END $$;

-- 2. Trigger
CREATE OR REPLACE FUNCTION protect_first_timer_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.first_timer_date IS NOT NULL AND NEW.first_timer_date IS DISTINCT FROM OLD.first_timer_date THEN
        RAISE EXCEPTION 'Cannot modify first_timer_date once set.';
    END IF;

    IF OLD.first_timer_service_id IS NOT NULL AND NEW.first_timer_service_id IS DISTINCT FROM OLD.first_timer_service_id THEN
        RAISE EXCEPTION 'Cannot modify first_timer_service_id once set.';
    END IF;

    IF OLD.is_first_timer IS TRUE AND NEW.is_first_timer IS FALSE THEN
         RAISE EXCEPTION 'Cannot unset is_first_timer status.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_first_timer ON public.members;
CREATE TRIGGER trg_protect_first_timer
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION protect_first_timer_fields();

-- 3. RPC
DROP FUNCTION IF EXISTS submit_member_entry(text, text, text, text, text, timestamptz, text, text, boolean, timestamptz, jsonb);

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
  _attended_service_ids jsonb,
  _current_service_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  DECLARE
    target_id uuid;
    result public.members%ROWTYPE;
    action text := 'INSERT';
    match_reason text := 'NEW_RECORD';
    v_first_timer_date date := NULL;
    v_is_first_timer boolean := false;
    v_first_timer_service_id text := NULL;
    
    v_name_norm text;
    v_phone_last9 text;
    v_residency_norm text;
  BEGIN
    -- Ensure ID is UUID
    IF _id IS NULL OR _id = '' THEN
        target_id := gen_random_uuid();
    ELSE
        BEGIN
            target_id := _id::uuid;
        EXCEPTION WHEN OTHERS THEN
            target_id := gen_random_uuid();
        END;
    END IF;
   
    IF target_id IS NULL THEN
        target_id := gen_random_uuid();
    END IF;

    -- 0. Robust Deduplication
    v_name_norm := LOWER(TRIM(REGEXP_REPLACE(_name, '\s+', ' ', 'g')));
    v_phone_last9 := RIGHT(TRIM(_phone), 9);
    v_residency_norm := COALESCE(LOWER(TRIM(REGEXP_REPLACE(_residency, '\s+', ' ', 'g'))), '');

    -- Try to find existing record first
    SELECT * INTO result FROM public.members 
    WHERE name_norm = v_name_norm 
      AND phone_last9 = v_phone_last9 
      AND residency_norm = v_residency_norm
    LIMIT 1;
    
    -- Fallback search on raw fields
    IF result IS NULL THEN
        SELECT * INTO result FROM public.members 
        WHERE TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g')) ILIKE TRIM(REGEXP_REPLACE(_name, '\s+', ' ', 'g')) 
          AND RIGHT(TRIM(phone), 9) = RIGHT(TRIM(_phone), 9)
          AND COALESCE(TRIM(REGEXP_REPLACE(residency, '\s+', ' ', 'g')), '') ILIKE COALESCE(TRIM(REGEXP_REPLACE(_residency, '\s+', ' ', 'g')), '')
        LIMIT 1;
    END IF;

    IF result IS NOT NULL THEN
       -- Existing record found
       BEGIN
          target_id := result.id::uuid;
       EXCEPTION WHEN OTHERS THEN
          target_id := result.id::uuid;
       END;

       action := 'MERGE';
       match_reason := 'NAME_PHONE_RESIDENCY_MATCH';

       -- Logic: Existing Member check-in
       IF result.category = 'First Timer' THEN
         UPDATE public.members SET category = 'Member' WHERE id::text = target_id::text;
         result.category := 'Member';
       END IF;

    ELSE
        -- 1. Insert New
        IF _category = 'First Timer' THEN
             v_is_first_timer := true;
             v_first_timer_date := COALESCE(_check_in_time::date, NOW()::date);
             v_first_timer_service_id := _current_service_id;
        ELSE
             v_is_first_timer := false;
        END IF;

        -- ATOMIC INSERT OR UPDATE
        -- We uses DO UPDATE to ensure we get the record back even if conflict occurs.
        -- We act as a "Get or Create" + "Update check_in_time".
        -- We do NOT update is_first_timer fields in the DO UPDATE clause, preserving existing state.
        
        INSERT INTO public.members (
          id, name, category, phone, status, 
          check_in_time, gender, residency, born_again, joined_date, attended_service_ids,
          is_first_timer, first_timer_date, first_timer_service_id
        )
        VALUES (
          target_id, _name, _category, _phone, _status, 
          _check_in_time, _gender, _residency, _born_again, _joined_date, _attended_service_ids,
          v_is_first_timer, v_first_timer_date, v_first_timer_service_id
        )
        ON CONFLICT (name_norm, phone_last9, residency_norm) 
        DO UPDATE SET 
            check_in_time = EXCLUDED.check_in_time, -- Valid update: Last Seen
            -- We can assume other fields might be updated too from the form?
            -- Safe to update basics?
            phone = EXCLUDED.phone,
            residency = EXCLUDED.residency,
            status = EXCLUDED.status
            -- We DO NOT update category, is_first_timer, first_timer_date, etc.
        RETURNING * INTO result;
        
        -- If we landed here implies we successfully Inserted OR Updated.
        -- Check if it was an "insert" or "merge".
        -- Comparison of Created At close to now? Or check if ID changed?
        -- target_id (generated) vs result.id (returned).
        
        IF result.id::text <> target_id::text THEN
            action := 'MERGE';
            match_reason := 'UNIQUE_CONFLICT_RECOVERED';
            target_id := result.id::uuid;
            
            -- If we merged, apply the Category Flip logic if needed
             IF result.category = 'First Timer' THEN
                UPDATE public.members SET category = 'Member' WHERE id::text = target_id::text;
                result.category := 'Member';
             END IF;
        ELSE
             action := 'INSERT';
        END IF;

    END IF;

    -- 3. Attendance Logic
    IF _attended_service_ids IS NOT NULL AND jsonb_array_length(_attended_service_ids) > 0 THEN
      INSERT INTO public.service_attendance (member_id, service_id, check_in_time)
      SELECT target_id, value, _check_in_time
      FROM jsonb_array_elements_text(_attended_service_ids)
      ON CONFLICT (member_id, service_id) DO NOTHING;
    END IF;

    -- 4. Sync attended_service_ids ARRAY
    IF _attended_service_ids IS NOT NULL THEN
        UPDATE public.members 
        SET attended_service_ids = (
            SELECT jsonb_agg(DISTINCT x) 
            FROM (
                SELECT jsonb_array_elements_text(attended_service_ids) as x FROM public.members WHERE id::text = target_id::text
                UNION
                SELECT jsonb_array_elements_text(_attended_service_ids) as x
            ) t
        )
        WHERE id::text = target_id::text;
    END IF;

    RETURN to_jsonb(result) || jsonb_build_object('_meta', jsonb_build_object('action', action, 'match_reason', match_reason));
  END;
$$;
