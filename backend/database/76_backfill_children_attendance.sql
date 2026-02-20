-- Phase 8: Backfill Historical Children Attendance
-- This script migrates the existing `attended_service_ids` array from the `children` table
-- into the newly created relational `children_attendance` table, ensuring zero data loss.

DO $$
DECLARE
    records_inserted INT := 0;
BEGIN
    RAISE NOTICE 'Starting historical attendance backfill for children...';

    -- Insert records by unnesting the attended_service_ids array for each child.
    -- We use ON CONFLICT DO NOTHING to ensure idempotence (safe to run multiple times).
    WITH raw_unnested AS (
        SELECT 
            c.id AS child_id,
            jsonb_array_elements_text(c.attended_service_ids) AS service_id_text,
            c.manifest_id
        FROM 
            public.children c
        WHERE 
            c.attended_service_ids IS NOT NULL 
            AND jsonb_typeof(c.attended_service_ids) = 'array'
            AND jsonb_array_length(c.attended_service_ids) > 0
    ),
    unnested_attendance AS (
        SELECT 
            child_id,
            service_id_text::UUID AS service_id,
            manifest_id
        FROM raw_unnested
        WHERE service_id_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
    INSERT INTO public.children_attendance (child_id, service_id, manifest_id)
    SELECT 
        ua.child_id, 
        ua.service_id, 
        ua.manifest_id
    FROM 
        unnested_attendance ua
    INNER JOIN 
        public.ministry_events me ON me.id = ua.service_id
    ON CONFLICT (child_id, service_id) DO NOTHING;

    GET DIAGNOSTICS records_inserted = ROW_COUNT;
    
    RAISE NOTICE 'Successfully backfilled % historical children attendance records.', records_inserted;
END $$;
