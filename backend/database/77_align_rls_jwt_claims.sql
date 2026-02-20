
-- Phase 9: Align RLS JWT Claims
-- The previous RLS policy was attempting to read manifest_id from the root of the JWT.
-- However, Supabase Auth stores custom claims in the 'app_metadata' object.

DO $$
DECLARE
    tbl RECORD;
    core_tables TEXT[] := ARRAY[
        'users',
        'members',
        'children',
        'ministry_events',
        'pickup_stations',
        'vehicles',
        'passengers',
        'souls',
        'service_attendance',
        'volunteer_attendance',
        'incidents',
        'personal_vehicles',
        'department_requests',
        'report_submissions',
        'requisitions',
        'assets',
        'transactions',
        'monitoring_reports',
        'healing_reports',
        'school_outreach_reports',
        'next_gen_souls'
    ];
BEGIN
    FOR tbl IN SELECT unnest(core_tables) AS table_name
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl.table_name) THEN
            
            RAISE NOTICE 'Updating RLS Policy on Table: %', tbl.table_name;

            -- 1. Drop existing policy
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I;', tbl.table_name);

            -- 2. Create updated policy that correctly looks in app_metadata
            EXECUTE format(
                'CREATE POLICY "Tenant Isolation" ON public.%I ' ||
                'FOR ALL ' ||
                'USING (manifest_id = (auth.jwt() -> ''app_metadata'' ->> ''manifest_id'')::uuid);',
                tbl.table_name
            );

            RAISE NOTICE 'Policy updated for %', tbl.table_name;
        END IF;
    END LOOP;
END $$;
