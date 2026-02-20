-- Phase 2: Add Manifest ID to Core Tables & Backfill
-- This script associates every record in the system with a specific Manifest to establish Multi-Tenant Isolation.

-- 1. Identify the Default Manifest (The one we just migrated to UUID)
-- We assume there is at least one manifest in the `manifest_details` table. We will use the first one found as the default for backfilling.
DO $$
DECLARE
    default_manifest_id UUID;
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
    -- Get the ID of the default manifest
    SELECT id INTO default_manifest_id FROM manifest_details LIMIT 1;

    IF default_manifest_id IS NULL THEN
        RAISE EXCEPTION 'No manifest found in manifest_details. Please create one before running this migration.';
    END IF;

    RAISE NOTICE 'Using Default Manifest ID: %', default_manifest_id;

    -- Loop through all defined core tables
    FOR tbl IN SELECT unnest(core_tables) AS table_name
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl.table_name) THEN
            
            RAISE NOTICE 'Processing Table: %', tbl.table_name;

            -- 1. Add the column (nullable initially)
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS manifest_id UUID;', tbl.table_name);

            -- 2. Backfill existing records with the default manifest ID
            EXECUTE format('UPDATE public.%I SET manifest_id = %L WHERE manifest_id IS NULL;', tbl.table_name, default_manifest_id);

            -- 3. Enforce NOT NULL constraint
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN manifest_id SET NOT NULL;', tbl.table_name);

            -- 4. Add Foreign Key constraint linking back to manifest_details
            -- First, drop if it exists to make it idempotent
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS fk_%I_manifest;', tbl.table_name, tbl.table_name);
            
            EXECUTE format(
                'ALTER TABLE public.%I ADD CONSTRAINT fk_%I_manifest FOREIGN KEY (manifest_id) REFERENCES public.manifest_details(id) ON DELETE CASCADE;', 
                tbl.table_name, tbl.table_name
            );

            RAISE NOTICE 'Successfully applied manifest_id to %', tbl.table_name;
        ELSE
            RAISE NOTICE 'Skipping Table (Not Found): %', tbl.table_name;
        END IF;

    END LOOP;

    RAISE NOTICE 'Phase 2 Database Migration Complete.';
END $$;
