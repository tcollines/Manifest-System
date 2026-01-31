-- 1. Add schema columns
ALTER TABLE public.children
ADD COLUMN IF NOT EXISTS is_first_timer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS first_timer_date date,
ADD COLUMN IF NOT EXISTS first_timer_service_id text;

-- 2. Add Constraint
ALTER TABLE public.children 
DROP CONSTRAINT IF EXISTS check_child_first_timer_requirements;

ALTER TABLE public.children
ADD CONSTRAINT check_child_first_timer_requirements
CHECK (is_first_timer = false OR (is_first_timer = true AND first_timer_date IS NOT NULL));

-- 3. Create Trigger Function (Immutability)
CREATE OR REPLACE FUNCTION protect_children_first_timer_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent modifying first_timer_date if already set
    IF OLD.first_timer_date IS NOT NULL AND NEW.first_timer_date IS DISTINCT FROM OLD.first_timer_date THEN
        RAISE EXCEPTION 'Cannot modify first_timer_date for child once set.';
    END IF;

    -- Prevent modifying first_timer_service_id if already set
    IF OLD.first_timer_service_id IS NOT NULL AND NEW.first_timer_service_id IS DISTINCT FROM OLD.first_timer_service_id THEN
        RAISE EXCEPTION 'Cannot modify first_timer_service_id for child once set.';
    END IF;

    -- Prevent unsetting is_first_timer
    IF OLD.is_first_timer IS TRUE AND NEW.is_first_timer IS FALSE THEN
         RAISE EXCEPTION 'Cannot unset is_first_timer status for child.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Apply Trigger
DROP TRIGGER IF EXISTS trigger_protect_children_first_timer ON public.children;

CREATE TRIGGER trigger_protect_children_first_timer
BEFORE UPDATE ON public.children
FOR EACH ROW
EXECUTE FUNCTION protect_children_first_timer_fields();

-- 5. Create RPC: submit_child_entry
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
    target_id uuid;
    result public.children%ROWTYPE;
    action text := 'INSERT';
    match_reason text := 'NEW_RECORD';
    
    v_first_timer_date date := NULL;
    v_is_first_timer boolean := false;
    v_first_timer_service_id text := NULL;
    
    v_name_norm text;
    v_contact_norm text;
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

    -- 0. Deduplication Logic: Normalize Name & Parent Contact
    v_name_norm := LOWER(TRIM(REGEXP_REPLACE(_name, '\s+', ' ', 'g')));
    
    -- Normalize contact (remove spaces/dashes)
    v_contact_norm := REGEXP_REPLACE(_parent_contact, '\D', '', 'g');
    -- Maybe take last 9 digits for loose matching? 
    -- Or strict? Let's try strict normalized first.
    -- Ideally, we match 'John' + '0771234567'.
    
    -- Try to find existing record
    SELECT * INTO result FROM public.children 
    WHERE LOWER(TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g'))) = v_name_norm 
      AND REGEXP_REPLACE(parent_contact, '\D', '', 'g') = v_contact_norm
    LIMIT 1;

    IF result IS NOT NULL THEN
       -- Existing Child Found
       target_id := result.id;
       action := 'MERGE';
       match_reason := 'NAME_PARENT_CONTACT_MATCH';

       -- LOGIC: Auto-Promote from First Timer to Member
       -- If they were a First Timer before, and are checking in now (check_in_time is set),
       -- flip them to 'Member'.
       IF result.category = 'First Timer' THEN
           UPDATE public.children SET category = 'Member' WHERE id = target_id;
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

        INSERT INTO public.children (
          id, name, parent_name, parent_contact, age, gender, residence, allergies,
          status, check_in_time, joined_date, attended_service_ids, category,
          is_first_timer, first_timer_date, first_timer_service_id
        )
        VALUES (
          target_id, _name, _parent_name, _parent_contact, _age, _gender, _residence, _allergies,
          _status, _check_in_time, _joined_date, _attended_service_ids, _category,
          v_is_first_timer, v_first_timer_date, v_first_timer_service_id
        )
        RETURNING * INTO result;
    END IF;

    -- 3. Attendance Logic (Append Service ID)
    IF _attended_service_ids IS NOT NULL THEN
        UPDATE public.children 
        SET attended_service_ids = (
            SELECT jsonb_agg(DISTINCT x) 
            FROM (
                SELECT jsonb_array_elements_text(attended_service_ids) as x FROM public.children WHERE id = target_id
                UNION
                SELECT jsonb_array_elements_text(_attended_service_ids) as x
            ) t
        )
        WHERE id = target_id;
    END IF;
    
    -- Also update check_in_time if provided
    IF _check_in_time IS NOT NULL THEN
        UPDATE public.children SET check_in_time = _check_in_time WHERE id = result.id;
        result.check_in_time := _check_in_time;
    END IF;

    RETURN to_jsonb(result) || jsonb_build_object('_meta', jsonb_build_object('action', action, 'match_reason', match_reason));
  END;
$$;
