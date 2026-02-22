// Create SQL File
const fs = require('fs');

const sql = `
-- Drop existing RPC if it exists
DROP FUNCTION IF EXISTS get_event_attendees_unified(uuid, text);

-- Create a high-performance function to return unified attendees (Direct + Passengers)
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
    -- 1. Direct Attendees (Service/Event)
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

    -- 2. Passenger Attendees (Excluding those already direct attendees)
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
          -- O(N*M) Killer: Prevent returning the passenger if they are already checked in as a direct attendee
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
`;

fs.writeFileSync('d:/Manifest System/backend/database/rpc_get_event_attendees.sql', sql);
console.log('SQL RPC File Created');
