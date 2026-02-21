-- Fix UUID Mismatch in Child Registration RPC
-- Redefines submit_child_entry to use uuid for service tracking columns

CREATE OR REPLACE FUNCTION submit_child_entry(
  _manifest_id uuid,
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
  _current_service_id uuid DEFAULT NULL -- CHANGED FROM text
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
    v_first_timer_service_id uuid := NULL; -- CHANGED FROM text
    
    v_name_norm text;
    v_contact_norm text;
  BEGIN
    IF _id IS NULL OR _id = '' THEN
        target_id := gen_random_uuid()::text;
    ELSE
        target_id := _id; 
    END IF;
   
    v_name_norm := LOWER(TRIM(_name));
    v_contact_norm := REGEXP_REPLACE(_parent_contact, '[^0-9]', '', 'g');

    IF _category = 'First Timer' THEN
         v_is_first_timer := true;
         v_first_timer_date := COALESCE(_check_in_time::date, NOW()::date);
         v_first_timer_service_id := _current_service_id;
    ELSE
         v_is_first_timer := false;
    END IF;
    
    -- Atomic Upsert with Tenant Scope
    INSERT INTO public.children (
      manifest_id,
      id, id_legacy_deprecated, name, parent_name, parent_contact, age, gender, residence, allergies,
      status, check_in_time, joined_date, attended_service_ids, category,
      is_first_timer, first_timer_date, first_timer_service_id,
      check_out_time
    )
    VALUES (
      _manifest_id,
      target_id::uuid, target_id, _name, _parent_name, _parent_contact, _age, _gender, _residence, _allergies,
      _status, _check_in_time, _joined_date, _attended_service_ids, _category,
      v_is_first_timer, v_first_timer_date, v_first_timer_service_id,
      NULL
    )
    ON CONFLICT (manifest_id, LOWER(TRIM(name)), REGEXP_REPLACE(parent_contact, '[^0-9]', '', 'g'))
    DO UPDATE SET
        check_in_time = EXCLUDED.check_in_time, 
        status = EXCLUDED.status,
        check_out_time = NULL,            
        category = CASE 
            WHEN public.children.category = 'First Timer' THEN 'Member' 
            ELSE public.children.category 
        END,
        age = COALESCE(EXCLUDED.age, public.children.age),
        residence = COALESCE(EXCLUDED.residence, public.children.residence)

    RETURNING * INTO result;
    
    IF result.id::text <> target_id THEN 
         action := 'MERGE';
         match_reason := 'ON_CONFLICT_MATCH';
         target_id := result.id::text;
    END IF;

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
        WHERE id = target_id::uuid;
    END IF;

    RETURN to_jsonb(result) || jsonb_build_object('_meta', jsonb_build_object('action', action, 'match_reason', match_reason));
  END;
$$;
