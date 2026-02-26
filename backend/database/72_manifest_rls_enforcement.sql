-- Phase 3: Enforce Row Level Security (RLS)
-- This script locks down all core tables so that queries from authenticated users ONLY return data 
-- for the manifest assigned to them via their JWT custom claim `manifest_id`.
-- Service Roles explicitly bypass RLS for administrative access from the backend.

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
            
            RAISE NOTICE 'Enforcing RLS on Table: %', tbl.table_name;

            -- 1. Enable RLS on the table
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.table_name);

            -- 2. Drop the policy if it already exists to ensure idempotency
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I;', tbl.table_name);

            -- 3. Create the Tenant Isolation policy using the JWT manifest_id claim
            -- Note: We use nullif() and cast to uuid to safely handle missing claims without throwing type errors,
            -- allowing Supabase to just safely evaluate to NULL and reject the access.
            EXECUTE format(
                'CREATE POLICY "Tenant Isolation" ON public.%I ' ||
                'FOR ALL ' ||
                'USING (manifest_id = nullif(auth.jwt() ->> ''manifest_id'', '''')::uuid);',
                tbl.table_name
            );

            RAISE NOTICE 'RLS and Tenant Isolation Policy applied to %', tbl.table_name;
        ELSE
            RAISE NOTICE 'Skipping Table (Not Found): %', tbl.table_name;
        END IF;

    END LOOP;

    RAISE NOTICE 'Phase 3 Row Level Security Enforcement Complete.';
END $$;
