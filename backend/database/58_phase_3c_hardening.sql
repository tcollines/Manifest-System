
-- 58_phase_3c_hardening.sql
-- Stage 3C Sub-Phase 1: Schema Hardening
-- Goal: Enforce NOT NULL constraints and UUID defaults.
-- Safety: legacy_* columns and nullable relationships are PRESERVED.

BEGIN;

-- 1. ENFORCE NOT NULL & DEFAULTS ON PRIMARY KEYS
-- -----------------------------------------------------------------------------
-- Ensure future records automatically receive UUIDs at the DB level.

ALTER TABLE public.members 
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.ministry_events 
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.pickup_stations 
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.vehicles 
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.passengers 
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. ENFORCE NOT NULL ON CORE FOREIGN KEYS
-- -----------------------------------------------------------------------------

-- pickup_stations -> ministry_events
ALTER TABLE public.pickup_stations ALTER COLUMN event_id SET NOT NULL;

-- vehicles -> pickup_stations, ministry_events
ALTER TABLE public.vehicles ALTER COLUMN station_id SET NOT NULL;
ALTER TABLE public.vehicles ALTER COLUMN event_id SET NOT NULL;

-- passengers -> vehicles, ministry_events
ALTER TABLE public.passengers ALTER COLUMN vehicle_id SET NOT NULL;
ALTER TABLE public.passengers ALTER COLUMN event_id SET NOT NULL;

-- service_attendance -> members, ministry_events
ALTER TABLE public.service_attendance ALTER COLUMN member_id SET NOT NULL;
ALTER TABLE public.service_attendance ALTER COLUMN service_id SET NOT NULL;

-- volunteer_attendance -> ministry_events
ALTER TABLE public.volunteer_attendance ALTER COLUMN service_id SET NOT NULL;

-- incidents -> ministry_events
ALTER TABLE public.incidents ALTER COLUMN service_id SET NOT NULL;

-- souls -> ministry_events (Mandatory)
-- station_id and vehicle_id remain NULLABLE for souls.
ALTER TABLE public.souls ALTER COLUMN event_id SET NOT NULL;

-- Note: personal_vehicles.current_service_id remains NULLABLE 
-- to support 'Absent' and 'Checked Out' statuses.

COMMIT;
