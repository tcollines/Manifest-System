-- FIX: Explicitly cast target_id (text) to UUID when inserting/comparing with children.id (uuid)
CREATE OR REPLACE FUNCTION submit_child_entry(
  _id text,
  _name text,
  _parent_name text,
  _parent_contact text,
  _age integer,
  _gender text,
  _residence text,
  _allergies text,
  _status text,
  _check_in_time timestamptz,
  _joined_date timestamptz,
  _attended_service_ids jsonb,
  _category text,
  _current_service_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  DECLARE
    target_id text; 
    result public.children%ROWTYPE;
    action text := 'INSERT';
    match_reason text := 'NEW_RECORD';
    
    v_first_timer_date date := NULL;
    v_is_first_timer boolean := false;
    v_first_timer_service_id text := NULL;
    
    v_name_norm text;
    v_contact_norm text;
  BEGIN
    -- Ensure ID is generated if missing
    IF _id IS NULL OR _id = '' THEN
        target_id := gen_random_uuid()::text;
    ELSE
        target_id := _id; 
    END IF;
   
    -- Align inputs with Index Definition
    v_name_norm := LOWER(TRIM(_name));
    v_contact_norm := REGEXP_REPLACE(_parent_contact, '[^0-9]', '', 'g');

    -- Setup First Timer Logic for NEW entries
    IF _category = 'First Timer' THEN
         v_is_first_timer := true;
         v_first_timer_date := COALESCE(_check_in_time::date, NOW()::date);
         v_first_timer_service_id := _current_service_id;
    ELSE
         v_is_first_timer := false;
    END IF;
    
    -- Atomic Upsert
    INSERT INTO public.children (
      id, id_legacy_deprecated, name, parent_name, parent_contact, age, gender, residence, allergies,
      status, check_in_time, joined_date, attended_service_ids, category,
      is_first_timer, first_timer_date, first_timer_service_id,
      check_out_time
    )
    VALUES (
      target_id::uuid, -- FIX: Explicit Cast to UUID
      target_id,       -- FIX: Populate legacy column (Text)
      _name, _parent_name, _parent_contact, _age, _gender, _residence, _allergies,
      _status, _check_in_time, _joined_date, _attended_service_ids, _category,
      v_is_first_timer, v_first_timer_date, v_first_timer_service_id,
      NULL -- Default check_out_time to NULL for new entries
    )
    ON CONFLICT (LOWER(TRIM(name)), REGEXP_REPLACE(parent_contact, '[^0-9]', '', 'g'))
    DO UPDATE SET
        -- FRESH START LOGIC:
        check_in_time = EXCLUDED.check_in_time, 
        status = EXCLUDED.status,         -- Reset status (e.g. to 'Checked In')
        check_out_time = NULL,            -- Clear previous checkout time
        
        -- MERGE / PROMOTION LOGIC:
        category = CASE 
            WHEN public.children.category = 'First Timer' THEN 'Member' 
            ELSE public.children.category 
        END,
        
        -- Update specific mutable fields if provided (Optional refinement)
        age = COALESCE(EXCLUDED.age, public.children.age),
        residence = COALESCE(EXCLUDED.residence, public.children.residence)

    RETURNING * INTO result;
    
    -- Detect Merge
    -- Comparsion between uuid and text should be handled by casting result.id to text
    IF result.id::text <> target_id THEN 
         action := 'MERGE';
         match_reason := 'ON_CONFLICT_MATCH';
         target_id := result.id::text;
    END IF;

    -- Attendance Array Logic (Append Service ID)
    IF _attended_service_ids IS NOT NULL THEN
        UPDATE public.children 
        SET attended_service_ids = (
            SELECT jsonb_agg(DISTINCT x) 
            FROM (
                SELECT jsonb_array_elements_text(attended_service_ids) as x FROM public.children WHERE id = target_id::uuid
                UNION
                SELECT jsonb_array_elements_text(_attended_service_ids) as x
            ) t
        )
        WHERE id = target_id::uuid; -- FIX: Explicit Cast to UUID
    END IF;

    RETURN to_jsonb(result) || jsonb_build_object('_meta', jsonb_build_object('action', action, 'match_reason', match_reason));
  END;
$$;
