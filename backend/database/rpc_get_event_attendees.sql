-- Drop existing RPC if it exists
DROP FUNCTION IF EXISTS get_event_attendees_unified(uuid, text);

-- 1. Create Functional Indexes to ensure the JOIN conditions are blazingly fast
CREATE INDEX IF NOT EXISTS idx_members_phone_lower ON members (LOWER(TRIM(phone)));
CREATE INDEX IF NOT EXISTS idx_members_name_lower ON members (LOWER(TRIM(name)));
CREATE INDEX IF NOT EXISTS idx_passengers_contact_lower ON passengers (LOWER(TRIM(contact)));
CREATE INDEX IF NOT EXISTS idx_passengers_name_lower ON passengers (LOWER(TRIM(name)));

-- 2. Create a high-performance function to return unified attendees (Direct + Passengers)
CREATE OR REPLACE FUNCTION get_event_attendees_unified(target_event_id uuid, target_manifest_id text)
RETURNS TABLE (
    id uuid,
    name text,
    phone text,
    category text,
    status text,
    check_in_time timestamp with time zone,
    gender text,
    residency text,
    source text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    -- A. Direct Attendees (Service/Event)
    SELECT 
        m.id,
        m.name,
        m.phone,
        m.category,
        'Checked In'::text as status,
        sa.check_in_time,
        m.gender,
        m.residency,
        'Direct'::text as source
    FROM service_attendance sa
    JOIN members m ON sa.member_id = m.id
    WHERE sa.manifest_id = target_manifest_id 
      AND m.manifest_id = target_manifest_id
      AND sa.service_id = target_event_id

    UNION ALL

    -- B. Passenger Attendees (Excluding those already direct attendees)
    SELECT 
        p.id,
        p.name,
        p.contact as phone,
        p.category,
        'Checked In'::text as status,
        NULL::timestamp with time zone as check_in_time,
        p.gender,
        p.residence as residency,
        'Logistics'::text as source
    FROM passengers p
    JOIN vehicles v ON p.vehicle_id = v.id
    JOIN pickup_stations ps ON v.station_id = ps.id
    WHERE p.manifest_id = target_manifest_id
      AND v.manifest_id = target_manifest_id
      AND ps.manifest_id = target_manifest_id
      AND ps.event_id = target_event_id
      AND NOT EXISTS (
          -- O(N*M) Killer: PostgreSQL Hash Anti-Join replaces single-threaded JS nested loops
          SELECT 1 
          FROM service_attendance sa
          JOIN members m ON sa.member_id = m.id
          WHERE sa.manifest_id = target_manifest_id
            AND m.manifest_id = target_manifest_id
            AND sa.service_id = target_event_id
            AND LOWER(TRIM(m.phone)) = LOWER(TRIM(p.contact))
            AND LOWER(TRIM(m.name)) = LOWER(TRIM(p.name))
      );
END;
$$;
