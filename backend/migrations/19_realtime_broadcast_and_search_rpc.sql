-- Migration 19: Realtime Broadcast Setup, Phone Normalization, Trigram Indexes, and Search RPC

-- 1. Enable pg_trgm extension for fast substring ILIKE search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add generated normalized phone_digits column on members table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'members' 
          AND column_name = 'phone_digits'
    ) THEN
        ALTER TABLE public.members ADD COLUMN phone_digits text GENERATED ALWAYS AS (regexp_replace(phone, '\D', '', 'g')) STORED;
    END IF;
END $$;

-- 3. Create composite and trigram GIN indexes
CREATE INDEX IF NOT EXISTS idx_members_manifest_id ON public.members (manifest_id);
CREATE INDEX IF NOT EXISTS idx_members_name_trgm ON public.members USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_members_phone_digits_trgm ON public.members USING gin (phone_digits gin_trgm_ops);

-- 4. Create parameterized RPC search function with pageSize + 1 hasMore indicator
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
AS $$
DECLARE
    _offset integer;
    _fetch_limit integer;
    _clean_phone text;
    _search_term text;
BEGIN
    _offset := (_page - 1) * _page_size;
    _fetch_limit := _page_size + 1;
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
            ROW_NUMBER() OVER () as row_num
        FROM public.members m
        WHERE m.manifest_id = _manifest_id
          AND (
            _search_term = ''
            OR m.name ILIKE '%' || _search_term || '%'
            OR (_clean_phone <> '' AND m.phone_digits ILIKE '%' || _clean_phone || '%')
          )
        ORDER BY m.created_at DESC
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
        (c.total_rows > _page_size) as has_more
    FROM raw_results r, counted c
    WHERE r.row_num <= _page_size;
END;
$$;
