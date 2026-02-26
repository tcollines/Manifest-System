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

    -- First Timer Logic
    IF _category = 'First Timer' THEN
         v_is_first_timer := true;
         v_first_timer_date := COALESCE(_check_in_time::date, NOW()::date);
         v_first_timer_service_id := _current_service_id;
    ELSE
         v_is_first_timer := false;
    END IF;

    -- INSERT (No duplicate check as requested)
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
    RETURNING * INTO result;

    -- Attendance Logic
    IF _attended_service_ids IS NOT NULL AND jsonb_array_length(_attended_service_ids) > 0 THEN
      INSERT INTO public.service_attendance (member_id, service_id, check_in_time)
      SELECT target_id, value, _check_in_time
      FROM jsonb_array_elements_text(_attended_service_ids)
      ON CONFLICT (member_id, service_id) DO NOTHING;
    END IF;

    -- Sync attended_service_ids ARRAY
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
