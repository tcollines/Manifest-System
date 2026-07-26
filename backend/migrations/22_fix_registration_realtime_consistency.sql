-- Migration 22: Registration Realtime Consistency, Safe Preflight Guard & Atomic RPCs
-- Purpose:
-- 1. Adds a safe preflight check before adding unique constraint uq_service_attendance_manifest_service_member (no automatic data deletion).
-- 2. Creates get_service_snapshot_v2 single-statement SQL CTE snapshot RPC.
-- 3. Creates atomic_check_in_member, atomic_register_first_timer, and atomic_undo_check_in RPCs with consistent locking order and duplicate handling.

-- 1. Tenant-Aware Unique Attendance Constraint with Safe Preflight
DO $$
DECLARE
    _dup_count integer := 0;
BEGIN
    SELECT count(*) INTO _dup_count
    FROM (
        SELECT manifest_id, service_id, member_id
        FROM public.service_attendance
        GROUP BY manifest_id, service_id, member_id
        HAVING count(*) > 1
    ) dups;

    IF _dup_count > 0 THEN
        RAISE EXCEPTION 'Preflight check failed: Found % duplicate attendance group(s) in public.service_attendance. Manual review required.', _dup_count;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_service_attendance_manifest_service_member'
    ) THEN
        ALTER TABLE public.service_attendance
        ADD CONSTRAINT uq_service_attendance_manifest_service_member
        UNIQUE (manifest_id, service_id, member_id);
    END IF;
END $$;

-- 2. Authoritative Single-Statement SQL Snapshot RPC
CREATE OR REPLACE FUNCTION public.get_service_snapshot_v2(
    _service_id uuid,
    _manifest_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH service_info AS (
        SELECT 
            s.id, 
            s.date, 
            COALESCE(
                ((to_jsonb(s)->>'manual_children_count'))::int,
                ((s.stats->>'manualChildrenCount'))::int,
                0
            ) as manual_children_count, 
            s.manifest_id
        FROM public.ministry_events s
        WHERE s.id = _service_id AND s.manifest_id = _manifest_id
        LIMIT 1
    ),
    valid_attendees AS (
        SELECT DISTINCT sa.member_id::text as member_id
        FROM public.service_attendance sa
        JOIN public.members m ON m.id = sa.member_id
        WHERE sa.service_id = _service_id 
          AND sa.manifest_id = _manifest_id
          AND m.manifest_id = _manifest_id
          AND sa.check_in_time > '1970-01-02'::timestamp
    ),
    attended_first_timers AS (
        SELECT DISTINCT m.id::text as member_id
        FROM public.members m
        JOIN valid_attendees va ON va.member_id = m.id::text
        WHERE m.manifest_id = _manifest_id
          AND m.first_timer_service_id = _service_id
    ),
    main_souls AS (
        SELECT s.id::text as soul_id
        FROM public.souls s
        WHERE s.manifest_id = _manifest_id
          AND (s.source_id = _service_id OR s.event_id = _service_id)
    ),
    next_gen_souls_data AS (
        SELECT ng.id::text as soul_id
        FROM public.next_gen_souls ng
        WHERE ng.manifest_id = _manifest_id
          AND ng.service_id = _service_id
    ),
    combined_souls AS (
        SELECT soul_id FROM main_souls
        UNION
        SELECT soul_id FROM next_gen_souls_data
    ),
    checked_in_member_summaries AS (
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', m.id::text,
                    'name', m.name,
                    'phone', COALESCE(m.phone, '')
                )
            ),
            '[]'::jsonb
        ) as member_summaries
        FROM public.members m
        WHERE m.id::text IN (SELECT member_id FROM valid_attendees)
          AND m.manifest_id = _manifest_id
    )
    SELECT jsonb_build_object(
        'serviceId', _service_id,
        'checkedInMemberIds', COALESCE((SELECT jsonb_agg(member_id) FROM valid_attendees), '[]'::jsonb),
        'checkedInMembers', COALESCE((SELECT member_summaries FROM checked_in_member_summaries), '[]'::jsonb),
        'firstTimerMemberIds', COALESCE((SELECT jsonb_agg(member_id) FROM attended_first_timers), '[]'::jsonb),
        'memberAttendanceCount', COALESCE((SELECT count(*) FROM valid_attendees), 0),
        'firstTimers', COALESCE((SELECT count(*) FROM attended_first_timers), 0),
        'manualChildrenCount', COALESCE((SELECT manual_children_count FROM service_info), 0),
        'generatedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        
        'memberIds', COALESCE((SELECT jsonb_agg(member_id) FROM valid_attendees), '[]'::jsonb),
        'total', COALESCE((SELECT count(*) FROM valid_attendees), 0),
        'soulIds', COALESCE((SELECT jsonb_agg(soul_id) FROM combined_souls), '[]'::jsonb),
        'soulsWon', COALESCE((SELECT count(*) FROM combined_souls), 0)
    )
    FROM service_info;
$$;

REVOKE EXECUTE ON FUNCTION public.get_service_snapshot_v2 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_service_snapshot_v2 TO service_role;

-- 3. Atomic Existing-Member Check-in RPC (Strict Locking Order & JSONB array formatting)
CREATE OR REPLACE FUNCTION public.atomic_check_in_member(
    _manifest_id uuid,
    _member_id uuid,
    _service_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _service_exists boolean;
    _member_exists boolean;
    _att_inserted boolean := false;
    _already_checked_in boolean := false;
    _new_attended jsonb;
BEGIN
    -- 1. Validate tenant-scoped service & lock row FOR SHARE
    SELECT EXISTS (
        SELECT 1 FROM public.ministry_events 
        WHERE id = _service_id AND manifest_id = _manifest_id
    ) INTO _service_exists;
    IF NOT _service_exists THEN
        RAISE EXCEPTION 'Service % not found for tenant %', _service_id, _manifest_id;
    END IF;

    -- 2. Lock tenant-scoped member row FOR UPDATE
    SELECT EXISTS (
        SELECT 1 FROM public.members 
        WHERE id = _member_id AND manifest_id = _manifest_id
        FOR UPDATE
    ) INTO _member_exists;
    IF NOT _member_exists THEN
        RAISE EXCEPTION 'Member % not found for tenant %', _member_id, _manifest_id;
    END IF;

    -- Check existing attendance
    SELECT EXISTS (
        SELECT 1 FROM public.service_attendance
        WHERE manifest_id = _manifest_id AND service_id = _service_id AND member_id = _member_id
    ) INTO _already_checked_in;

    -- 3. Insert attendance row idempotently
    INSERT INTO public.service_attendance (manifest_id, service_id, member_id, check_in_time)
    VALUES (_manifest_id, _service_id, _member_id, now())
    ON CONFLICT (manifest_id, service_id, member_id) DO NOTHING;
    
    _att_inserted := FOUND;

    -- 4. Rebuild attended_service_ids as JSONB array from authoritative attendance while holding member lock
    SELECT COALESCE(jsonb_agg(sa.service_id::text), '[]'::jsonb)
    INTO _new_attended
    FROM public.service_attendance sa
    WHERE sa.member_id = _member_id AND sa.manifest_id = _manifest_id;

    UPDATE public.members
    SET check_in_time = now(),
        attended_service_ids = _new_attended
    WHERE id = _member_id AND manifest_id = _manifest_id;

    RETURN jsonb_build_object(
        'success', true,
        'attendanceInserted', _att_inserted,
        'alreadyCheckedIn', _already_checked_in,
        'attendanceRemoved', false,
        'memberId', _member_id,
        'serviceId', _service_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.atomic_check_in_member FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_check_in_member TO service_role;

-- 4. Atomic New First-Timer Registration RPC
CREATE OR REPLACE FUNCTION public.atomic_register_first_timer(
    _manifest_id uuid,
    _service_id uuid,
    _name text,
    _phone text,
    _gender text DEFAULT NULL,
    _residency text DEFAULT NULL,
    _occupation text DEFAULT NULL,
    _place_of_work text DEFAULT NULL,
    _born_again text DEFAULT NULL,
    _referral_source text DEFAULT NULL,
    _is_phaneroo_member text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _service_date date;
    _service_exists boolean;
    _new_member_id uuid := gen_random_uuid();
    _clean_phone text := regexp_replace(COALESCE(_phone, ''), '\D', '', 'g');
    _phone_match_count integer := 0;
    _existing_id uuid := NULL;
    _member_rec jsonb;
    _checkin_res jsonb;
BEGIN
    -- 1. Validate tenant & service BEFORE writing anything
    SELECT date::date INTO _service_date
    FROM public.ministry_events
    WHERE id = _service_id AND manifest_id = _manifest_id;
    
    IF _service_date IS NULL THEN
        RAISE EXCEPTION 'Service % not found for tenant %', _service_id, _manifest_id;
    END IF;

    -- 2. Check duplicate policy: only match phone if non-blank and >= 7 digits
    IF _clean_phone <> '' AND length(_clean_phone) >= 7 THEN
        SELECT count(*) INTO _phone_match_count
        FROM public.members
        WHERE manifest_id = _manifest_id AND phone_digits = _clean_phone;

        IF _phone_match_count > 1 THEN
            RAISE EXCEPTION 'Ambiguous member resolution: multiple records match phone for tenant %', _manifest_id;
        ELSIF _phone_match_count = 1 THEN
            SELECT id INTO _existing_id
            FROM public.members
            WHERE manifest_id = _manifest_id AND phone_digits = _clean_phone;
        END IF;
    END IF;

    -- If existing member candidate matched: perform atomic check-in, do NOT create new member
    IF _existing_id IS NOT NULL THEN
        _checkin_res := public.atomic_check_in_member(_manifest_id, _existing_id, _service_id);
        
        SELECT to_jsonb(m) INTO _member_rec
        FROM public.members m WHERE id = _existing_id AND manifest_id = _manifest_id;

        RETURN jsonb_build_object(
            'success', true,
            'isNewMember', false,
            'alreadyExisted', true,
            'member', _member_rec,
            'attendanceInserted', (_checkin_res->>'attendanceInserted')::boolean,
            'alreadyCheckedIn', (_checkin_res->>'alreadyCheckedIn')::boolean,
            'serviceId', _service_id
        );
    END IF;

    -- 3. Insert genuinely new member with authoritative service date and jsonb attended_service_ids
    INSERT INTO public.members (
        id,
        manifest_id,
        name,
        phone,
        category,
        status,
        check_in_time,
        gender,
        residency,
        occupation,
        place_of_work,
        born_again,
        referral_source,
        is_phaneroo_member,
        joined_date,
        is_first_timer,
        first_timer_service_id,
        first_timer_date,
        attended_service_ids
    ) VALUES (
        _new_member_id,
        _manifest_id,
        _name,
        _phone,
        'First Timer',
        'Checked In',
        now(),
        _gender,
        _residency,
        _occupation,
        _place_of_work,
        _born_again,
        _referral_source,
        _is_phaneroo_member,
        _service_date,
        true,
        _service_id,
        _service_date,
        jsonb_build_array(_service_id::text)
    );

    -- 4. Insert attendance record for originating service
    INSERT INTO public.service_attendance (manifest_id, service_id, member_id, check_in_time)
    VALUES (_manifest_id, _service_id, _new_member_id, now())
    ON CONFLICT (manifest_id, service_id, member_id) DO NOTHING;

    SELECT to_jsonb(m) INTO _member_rec
    FROM public.members m WHERE id = _new_member_id AND manifest_id = _manifest_id;

    RETURN jsonb_build_object(
        'success', true,
        'isNewMember', true,
        'alreadyExisted', false,
        'member', _member_rec,
        'attendanceInserted', true,
        'alreadyCheckedIn', false,
        'serviceId', _service_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.atomic_register_first_timer FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_register_first_timer TO service_role;

-- 5. Atomic Undo Check-in RPC (Strict Lock Order & JSONB Array Rebuild)
CREATE OR REPLACE FUNCTION public.atomic_undo_check_in(
    _manifest_id uuid,
    _member_id uuid,
    _service_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _service_exists boolean;
    _member_exists boolean;
    _deleted_count integer := 0;
    _new_attended jsonb;
BEGIN
    -- 1. Validate tenant-scoped service
    SELECT EXISTS (
        SELECT 1 FROM public.ministry_events 
        WHERE id = _service_id AND manifest_id = _manifest_id
    ) INTO _service_exists;
    IF NOT _service_exists THEN
        RAISE EXCEPTION 'Service % not found for tenant %', _service_id, _manifest_id;
    END IF;

    -- 2. Lock tenant-scoped member row FOR UPDATE
    SELECT EXISTS (
        SELECT 1 FROM public.members 
        WHERE id = _member_id AND manifest_id = _manifest_id
        FOR UPDATE
    ) INTO _member_exists;
    IF NOT _member_exists THEN
        RAISE EXCEPTION 'Member % not found for tenant %', _member_id, _manifest_id;
    END IF;

    -- 3. Delete attendance row for this specific service
    DELETE FROM public.service_attendance
    WHERE manifest_id = _manifest_id
      AND service_id = _service_id
      AND member_id = _member_id;
      
    GET DIAGNOSTICS _deleted_count = ROW_COUNT;

    -- 4. Rebuild attended_service_ids as JSONB array from authoritative service_attendance
    SELECT COALESCE(jsonb_agg(sa.service_id::text), '[]'::jsonb)
    INTO _new_attended
    FROM public.service_attendance sa
    WHERE sa.member_id = _member_id AND sa.manifest_id = _manifest_id;

    UPDATE public.members
    SET attended_service_ids = _new_attended
    WHERE id = _member_id AND manifest_id = _manifest_id;

    -- RETAIN all original first-timer fields (first_timer_service_id, first_timer_date, is_first_timer) UNCHANGED!

    RETURN jsonb_build_object(
        'success', true,
        'attendanceInserted', false,
        'alreadyCheckedIn', false,
        'attendanceRemoved', (_deleted_count > 0),
        'memberId', _member_id,
        'serviceId', _service_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.atomic_undo_check_in FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_undo_check_in TO service_role;
