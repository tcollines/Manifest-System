-- Migration 22: Registration Realtime Consistency, Unique Attendance Guard & Authoritative Snapshot RPC
-- Purpose:
-- 1. Adds unique constraint on public.service_attendance (manifest_id, service_id, member_id) to prevent duplicate check-ins.
-- 2. Creates/replaces public.get_service_snapshot_v2 single-statement SQL CTE snapshot RPC with complete fields and safe display summaries.

-- 1. Unique Attendance Constraint Guard
DO $$
BEGIN
    -- Remove any potential historical duplicate attendance rows
    DELETE FROM public.service_attendance a
    USING public.service_attendance b
    WHERE a.ctid < b.ctid
      AND a.manifest_id = b.manifest_id
      AND a.service_id = b.service_id
      AND a.member_id = b.member_id;

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
          AND (
            (m.first_timer_service_id = _service_id)
            OR ((to_jsonb(m)->>'firstTimerServiceId')::text = _service_id::text)
          )
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
        
        -- Backward-compatibility fields
        'memberIds', COALESCE((SELECT jsonb_agg(member_id) FROM valid_attendees), '[]'::jsonb),
        'total', COALESCE((SELECT count(*) FROM valid_attendees), 0),
        'soulIds', COALESCE((SELECT jsonb_agg(soul_id) FROM combined_souls), '[]'::jsonb),
        'soulsWon', COALESCE((SELECT count(*) FROM combined_souls), 0)
    )
    FROM service_info;
$$;

REVOKE EXECUTE ON FUNCTION public.get_service_snapshot_v2 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_service_snapshot_v2 TO service_role;
