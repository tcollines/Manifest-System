-- Migration 21: Realtime Broadcast Fix, Atomic SQL Snapshot & Multi-Token Search RPC

-- 1. Private Broadcast RLS Policy on realtime.messages
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'realtime' AND table_name = 'messages') THEN
        DROP POLICY IF EXISTS "Tenant private broadcast select policy" ON realtime.messages;
        CREATE POLICY "Tenant private broadcast select policy" 
        ON realtime.messages FOR SELECT 
        TO authenticated
        USING (
            COALESCE(
                auth.jwt()->'app_metadata'->>'manifest_id',
                auth.jwt()->>'manifest_id'
            ) IS NOT NULL
            AND (SELECT realtime.topic()) LIKE
                'manifest:' ||
                COALESCE(
                    auth.jwt()->'app_metadata'->>'manifest_id',
                    auth.jwt()->>'manifest_id'
                ) ||
                ':service:%'
        );
    END IF;
END $$;

-- 2. Custom Broadcast Trigger for Attendance Changes
CREATE OR REPLACE FUNCTION public.broadcast_attendance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _target_record record;
    _topic text;
    _payload jsonb;
BEGIN
    _target_record := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    
    IF _target_record.manifest_id IS NOT NULL AND _target_record.service_id IS NOT NULL THEN
        _topic := 'manifest:' || _target_record.manifest_id::text || ':service:' || _target_record.service_id::text;
        _payload := jsonb_build_object(
            'event', 'invalidate',
            'type', 'attendance',
            'action', TG_OP,
            'service_id', _target_record.service_id,
            'manifest_id', _target_record.manifest_id
        );
        
        PERFORM realtime.send(
            _payload,
            'invalidate',
            _topic,
            true
        );
    END IF;
    
    RETURN NULL;
END;
$$;

-- 3. Custom Broadcast Trigger for Souls (Main & NextGen)
CREATE OR REPLACE FUNCTION public.broadcast_soul_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _target_record record;
    _target_json jsonb;
    _service_id uuid;
    _manifest_id uuid;
    _topic text;
    _payload jsonb;
BEGIN
    _target_record := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    _manifest_id := _target_record.manifest_id;
    _target_json := to_jsonb(_target_record);
    
    IF TG_TABLE_NAME = 'souls' THEN
        _service_id := COALESCE((_target_json->>'source_id')::uuid, (_target_json->>'event_id')::uuid);
    ELSIF TG_TABLE_NAME = 'next_gen_souls' THEN
        _service_id := (_target_json->>'service_id')::uuid;
    END IF;

    IF _manifest_id IS NOT NULL AND _service_id IS NOT NULL THEN
        _topic := 'manifest:' || _manifest_id::text || ':service:' || _service_id::text;
        _payload := jsonb_build_object(
            'event', 'invalidate',
            'type', 'souls',
            'action', TG_OP,
            'service_id', _service_id,
            'manifest_id', _manifest_id
        );
        
        PERFORM realtime.send(
            _payload,
            'invalidate',
            _topic,
            true
        );
    END IF;

    RETURN NULL;
END;
$$;

-- 4. Custom Broadcast Trigger for Ministry Events / Services (Manual Children Count)
CREATE OR REPLACE FUNCTION public.broadcast_service_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _old_count int;
    _new_count int;
    _topic text;
    _payload jsonb;
BEGIN
    _old_count := COALESCE(
        ((to_jsonb(OLD)->>'manual_children_count'))::int,
        ((OLD.stats->>'manualChildrenCount'))::int,
        0
    );
    _new_count := COALESCE(
        ((to_jsonb(NEW)->>'manual_children_count'))::int,
        ((NEW.stats->>'manualChildrenCount'))::int,
        0
    );

    IF _old_count IS DISTINCT FROM _new_count THEN
        _topic := 'manifest:' || NEW.manifest_id::text || ':service:' || NEW.id::text;
        _payload := jsonb_build_object(
            'event', 'invalidate',
            'type', 'service',
            'action', 'UPDATE',
            'service_id', NEW.id,
            'manifest_id', NEW.manifest_id
        );
        
        PERFORM realtime.send(
            _payload,
            'invalidate',
            _topic,
            true
        );
    END IF;
    
    RETURN NULL;
END;
$$;

-- 5. Attach Triggers to Tables
DROP TRIGGER IF EXISTS trg_broadcast_service_attendance ON public.service_attendance;
CREATE TRIGGER trg_broadcast_service_attendance
    AFTER INSERT OR UPDATE OR DELETE ON public.service_attendance
    FOR EACH ROW EXECUTE FUNCTION public.broadcast_attendance_change();

DROP TRIGGER IF EXISTS trg_broadcast_souls ON public.souls;
CREATE TRIGGER trg_broadcast_souls
    AFTER INSERT OR UPDATE OR DELETE ON public.souls
    FOR EACH ROW EXECUTE FUNCTION public.broadcast_soul_change();

DROP TRIGGER IF EXISTS trg_broadcast_services ON public.ministry_events;
CREATE TRIGGER trg_broadcast_services
    AFTER UPDATE ON public.ministry_events
    FOR EACH ROW EXECUTE FUNCTION public.broadcast_service_change();

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'next_gen_souls') THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trg_broadcast_next_gen_souls ON public.next_gen_souls';
        EXECUTE 'CREATE TRIGGER trg_broadcast_next_gen_souls AFTER INSERT OR UPDATE OR DELETE ON public.next_gen_souls FOR EACH ROW EXECUTE FUNCTION public.broadcast_soul_change()';
    END IF;
END $$;

-- 6. Atomic Single-Statement SQL Snapshot RPC
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
        SELECT sa.member_id::text as member_id
        FROM public.service_attendance sa
        JOIN public.members m ON m.id = sa.member_id
        WHERE sa.service_id = _service_id 
          AND sa.manifest_id = _manifest_id
          AND m.manifest_id = _manifest_id
    ),
    attended_first_timers AS (
        SELECT COUNT(DISTINCT m.id) as first_timers_count
        FROM public.members m
        JOIN valid_attendees va ON va.member_id = m.id::text
        CROSS JOIN service_info si
        WHERE m.manifest_id = _manifest_id
          AND m.joined_date = si.date
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
    )
    SELECT jsonb_build_object(
        'serviceId', _service_id,
        'memberIds', COALESCE((SELECT jsonb_agg(member_id) FROM valid_attendees), '[]'::jsonb),
        'total', (SELECT count(*) FROM valid_attendees),
        'manualChildrenCount', COALESCE((SELECT manual_children_count FROM service_info), 0),
        'firstTimers', COALESCE((SELECT first_timers_count FROM attended_first_timers), 0),
        'soulIds', COALESCE((SELECT jsonb_agg(soul_id) FROM combined_souls), '[]'::jsonb),
        'soulsWon', (SELECT count(*) FROM combined_souls),
        'generatedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
    FROM service_info;
$$;

REVOKE EXECUTE ON FUNCTION public.get_service_snapshot_v2 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_service_snapshot_v2 TO service_role;

-- 7. Secure Search RPC (Multi-Token Matching & Unwrapped JSON Contract)
CREATE OR REPLACE FUNCTION public.search_members_v2(
    _manifest_id uuid,
    _search_query text DEFAULT '',
    _page integer DEFAULT 1,
    _page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _safe_page integer;
    _safe_page_size integer;
    _offset integer;
    _fetch_limit integer;
    _tokens text[];
    _clean_phone text;
    _rows jsonb;
    _has_more boolean;
BEGIN
    _safe_page := GREATEST(1, COALESCE(_page, 1));
    _safe_page_size := LEAST(100, GREATEST(1, COALESCE(_page_size, 20)));
    _offset := (_safe_page - 1) * _safe_page_size;
    _fetch_limit := _safe_page_size + 1;
    _clean_phone := regexp_replace(_search_query, '\D', '', 'g');
    
    _tokens := string_to_array(trim(COALESCE(_search_query, '')), ' ');

    WITH filtered_members AS (
        SELECT 
            m.id,
            m.name,
            m.category,
            m.phone,
            m.status,
            m.check_in_time::text,
            m.gender,
            m.residency,
            m.born_again,
            m.joined_date::text,
            m.attended_service_ids,
            m.created_at::text,
            m.occupation,
            m.place_of_work,
            m.email,
            m.is_phaneroo_member,
            m.referral_source
        FROM public.members m
        WHERE m.manifest_id = _manifest_id
          AND (
            _search_query IS NULL OR trim(_search_query) = ''
            OR (
                SELECT bool_and(m.name ILIKE '%' || token || '%')
                FROM unnest(_tokens) token
                WHERE trim(token) <> ''
            )
            OR (_clean_phone <> '' AND m.phone_digits ILIKE '%' || _clean_phone || '%')
          )
        ORDER BY m.name ASC, m.id ASC
        LIMIT _fetch_limit OFFSET _offset
    ),
    sliced AS (
        SELECT * FROM filtered_members LIMIT _safe_page_size
    )
    SELECT 
        COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb),
        (SELECT count(*) FROM filtered_members) > _safe_page_size
    INTO _rows, _has_more
    FROM sliced s;

    RETURN jsonb_build_object(
        'data', COALESCE(_rows, '[]'::jsonb),
        'page', _safe_page,
        'hasMore', COALESCE(_has_more, false)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_members_v2 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_members_v2 TO service_role;
