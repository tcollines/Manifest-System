-- Migration 20: Realtime Custom Broadcast Triggers, Security Definer Search RPC & Realtime RLS Policies

-- 1. Ensure pg_trgm extension exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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
        
        -- Broadcast using Supabase realtime
        PERFORM pg_notify('realtime:broadcast', jsonb_build_object(
            'topic', _topic,
            'event', 'invalidate',
            'payload', _payload
        )::text);
    END IF;
    
    RETURN _target_record;
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
    _service_id uuid;
    _manifest_id uuid;
    _topic text;
    _payload jsonb;
BEGIN
    _target_record := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    _manifest_id := _target_record.manifest_id;
    
    -- Resolve service_id based on table structure
    IF TG_TABLE_NAME = 'souls' THEN
        _service_id := COALESCE(_target_record.source_id, _target_record.event_id);
    ELSIF TG_TABLE_NAME = 'next_gen_souls' THEN
        _service_id := _target_record.service_id;
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
        
        PERFORM pg_notify('realtime:broadcast', jsonb_build_object(
            'topic', _topic,
            'event', 'invalidate',
            'payload', _payload
        )::text);
    END IF;

    RETURN _target_record;
END;
$$;

-- 4. Attach Triggers to Tables
DROP TRIGGER IF EXISTS trg_broadcast_service_attendance ON public.service_attendance;
CREATE TRIGGER trg_broadcast_service_attendance
    AFTER INSERT OR UPDATE OR DELETE ON public.service_attendance
    FOR EACH ROW EXECUTE FUNCTION public.broadcast_attendance_change();

DROP TRIGGER IF EXISTS trg_broadcast_souls ON public.souls;
CREATE TRIGGER trg_broadcast_souls
    AFTER INSERT OR UPDATE OR DELETE ON public.souls
    FOR EACH ROW EXECUTE FUNCTION public.broadcast_soul_change();

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'next_gen_souls') THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trg_broadcast_next_gen_souls ON public.next_gen_souls';
        EXECUTE 'CREATE TRIGGER trg_broadcast_next_gen_souls AFTER INSERT OR UPDATE OR DELETE ON public.next_gen_souls FOR EACH ROW EXECUTE FUNCTION public.broadcast_soul_change()';
    END IF;
END $$;

-- 5. RLS Authorization Policy for Realtime Messages Topic
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'realtime' AND table_name = 'messages') THEN
        ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Tenant private broadcast select policy" ON realtime.messages;
        CREATE POLICY "Tenant private broadcast select policy" 
        ON realtime.messages FOR SELECT 
        TO authenticated
        USING (
            topic LIKE 'manifest:' || COALESCE(
                (auth.jwt()->'app_metadata'->>'manifest_id'),
                (auth.jwt()->>'manifest_id')
            ) || '%'
        );
    END IF;
END $$;

-- 6. Secure Search RPC Function (service_role execution only)
CREATE OR REPLACE FUNCTION public.search_members_v2(
    _manifest_id uuid,
    _search_query text DEFAULT '',
    _page integer DEFAULT 1,
    _page_size integer DEFAULT 20
)
RETURNS TABLE (
    id uuid,
    name text,
    category text,
    phone text,
    status text,
    check_in_time text,
    gender text,
    residency text,
    born_again boolean,
    joined_date text,
    attended_service_ids text[],
    created_at text,
    occupation text,
    place_of_work text,
    email text,
    is_phaneroo_member boolean,
    referral_source text,
    has_more boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _offset integer;
    _fetch_limit integer;
    _clean_phone text;
    _search_term text;
    _safe_page integer;
    _safe_page_size integer;
BEGIN
    -- Validate page bounds
    _safe_page := GREATEST(1, COALESCE(_page, 1));
    _safe_page_size := LEAST(100, GREATEST(1, COALESCE(_page_size, 20)));
    _offset := (_safe_page - 1) * _safe_page_size;
    _fetch_limit := _safe_page_size + 1;
    _search_term := trim(coalesce(_search_query, ''));
    _clean_phone := regexp_replace(_search_term, '\D', '', 'g');

    RETURN QUERY
    WITH raw_results AS (
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
            m.referral_source,
            ROW_NUMBER() OVER (ORDER BY m.created_at DESC, m.id DESC) as row_num
        FROM public.members m
        WHERE m.manifest_id = _manifest_id
          AND (
            _search_term = ''
            OR m.name ILIKE '%' || _search_term || '%'
            OR (_clean_phone <> '' AND m.phone_digits ILIKE '%' || _clean_phone || '%')
          )
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT _fetch_limit OFFSET _offset
    ),
    counted AS (
        SELECT count(*) as total_rows FROM raw_results
    )
    SELECT 
        r.id,
        r.name,
        r.category,
        r.phone,
        r.status,
        r.check_in_time,
        r.gender,
        r.residency,
        r.born_again,
        r.joined_date,
        r.attended_service_ids,
        r.created_at,
        r.occupation,
        r.place_of_work,
        r.email,
        r.is_phaneroo_member,
        r.referral_source,
        (c.total_rows > _safe_page_size) as has_more
    FROM raw_results r, counted c
    WHERE r.row_num <= _safe_page_size;
END;
$$;

-- Security Enforcement: Revoke from public, anon, authenticated. Grant ONLY to service_role.
REVOKE EXECUTE ON FUNCTION public.search_members_v2 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_members_v2 TO service_role;
