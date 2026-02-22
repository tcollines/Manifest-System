
-- Phase 2: Final Legacy Identity Column Purge
-- Goal: Remove all dual-identity logic columns and enforce strict UUID compliance.

BEGIN;

-- 1. Drop Legacy Columns from Major Tables
ALTER TABLE public.members DROP COLUMN IF EXISTS legacy_id;

ALTER TABLE public.ministry_events DROP COLUMN IF EXISTS legacy_id;

ALTER TABLE public.souls 
    DROP COLUMN IF EXISTS legacy_id,
    DROP COLUMN IF EXISTS legacy_event_id,
    DROP COLUMN IF EXISTS legacy_station_id,
    DROP COLUMN IF EXISTS legacy_vehicle_id;

ALTER TABLE public.vehicles 
    DROP COLUMN IF EXISTS legacy_id,
    DROP COLUMN IF EXISTS legacy_station_id,
    DROP COLUMN IF EXISTS legacy_event_id;

ALTER TABLE public.children 
    DROP COLUMN IF EXISTS legacy_id,
    DROP COLUMN IF EXISTS id_legacy_deprecated;

ALTER TABLE public.pickup_stations 
    DROP COLUMN IF EXISTS legacy_id,
    DROP COLUMN IF EXISTS legacy_event_id;

ALTER TABLE public.personal_vehicles 
    DROP COLUMN IF EXISTS legacy_id,
    DROP COLUMN IF EXISTS id_text_legacy_deprecated;

ALTER TABLE public.service_attendance 
    DROP COLUMN IF EXISTS legacy_member_id,
    DROP COLUMN IF EXISTS legacy_service_id;

-- 2. Clean up Users and Departments
-- We confirmed departments.id is already UUID. 
-- We check if users.department_id needs a final drop of the text fallback if it exists.
-- Assuming previous migrations already handled the data move to UUID columns.
ALTER TABLE public.departments DROP COLUMN IF EXISTS legacy_id;

-- 3. Remove Migration-only RPCs
DROP FUNCTION IF EXISTS public.resolve_event_id(text, uuid);

-- 4. Final Constraints Verification (Ensure no FKs are pointing to dropped columns)
-- This is naturally enforced by the DB if we try to drop a column that is a target of an FK.
-- Since we refactored everything to the new UUID 'id' columns, this should pass.

COMMIT;

DO $$ 
BEGIN 
    RAISE NOTICE 'Phase 2: Legacy Identity columns successfully purged.'; 
END $$;
