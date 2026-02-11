
-- 56_phase_3b_rollback.sql
-- Corrected Phase 3B: Rollback Strategy
-- Goal: Reverse Phase 3B renames and restore legacy TEXT identities.
-- Constraint: No loss of data, return to Stage 3A compatible state.

BEGIN;

-- 1. DROP UUID-BASED FOREIGN KEY CONSTRAINTS
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.pickup_stations DROP CONSTRAINT IF EXISTS fk_pickup_stations_event;
ALTER TABLE IF EXISTS public.vehicles DROP CONSTRAINT IF EXISTS fk_vehicles_station;
ALTER TABLE IF EXISTS public.vehicles DROP CONSTRAINT IF EXISTS fk_vehicles_event;
ALTER TABLE IF EXISTS public.passengers DROP CONSTRAINT IF EXISTS fk_passengers_vehicle;
ALTER TABLE IF EXISTS public.passengers DROP CONSTRAINT IF EXISTS fk_passengers_event;
ALTER TABLE IF EXISTS public.service_attendance DROP CONSTRAINT IF EXISTS fk_service_attendance_member;
ALTER TABLE IF EXISTS public.service_attendance DROP CONSTRAINT IF EXISTS fk_service_attendance_service;
ALTER TABLE IF EXISTS public.volunteer_attendance DROP CONSTRAINT IF EXISTS fk_volunteer_attendance_service;
ALTER TABLE IF EXISTS public.incidents DROP CONSTRAINT IF EXISTS fk_incidents_service;
ALTER TABLE IF EXISTS public.souls DROP CONSTRAINT IF EXISTS fk_souls_event;
ALTER TABLE IF EXISTS public.souls DROP CONSTRAINT IF EXISTS fk_souls_station;
ALTER TABLE IF EXISTS public.souls DROP CONSTRAINT IF EXISTS fk_souls_vehicle;


-- 2. DROP PRIMARY KEY CONSTRAINTS (UUID-BASED)
-- -----------------------------------------------------------------------------
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_pkey CASCADE;
ALTER TABLE public.ministry_events DROP CONSTRAINT IF EXISTS ministry_events_pkey CASCADE;
ALTER TABLE public.pickup_stations DROP CONSTRAINT IF EXISTS pickup_stations_pkey CASCADE;
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_pkey CASCADE;
ALTER TABLE public.passengers DROP CONSTRAINT IF EXISTS passengers_pkey CASCADE;


-- 3. RENAME COLUMNS (Authoritative -> Shadow, legacy_* -> Original)
-- -----------------------------------------------------------------------------

-- members
ALTER TABLE public.members RENAME COLUMN id TO id_uuid;
ALTER TABLE public.members RENAME COLUMN legacy_id TO id;

-- ministry_events
ALTER TABLE public.ministry_events RENAME COLUMN id TO id_uuid;
ALTER TABLE public.ministry_events RENAME COLUMN legacy_id TO id;

-- pickup_stations
ALTER TABLE public.pickup_stations RENAME COLUMN id TO id_uuid;
ALTER TABLE public.pickup_stations RENAME COLUMN event_id TO event_id_uuid;
ALTER TABLE public.pickup_stations RENAME COLUMN legacy_id TO id;
ALTER TABLE public.pickup_stations RENAME COLUMN legacy_event_id TO event_id;

-- vehicles
ALTER TABLE public.vehicles RENAME COLUMN id TO id_uuid;
ALTER TABLE public.vehicles RENAME COLUMN station_id TO station_id_uuid;
ALTER TABLE public.vehicles RENAME COLUMN event_id TO event_id_uuid;
ALTER TABLE public.vehicles RENAME COLUMN legacy_id TO id;
ALTER TABLE public.vehicles RENAME COLUMN legacy_station_id TO station_id;
ALTER TABLE public.vehicles RENAME COLUMN legacy_event_id TO event_id;

-- passengers
ALTER TABLE public.passengers RENAME COLUMN id TO id_uuid;
ALTER TABLE public.passengers RENAME COLUMN vehicle_id TO vehicle_id_uuid;
ALTER TABLE public.passengers RENAME COLUMN event_id TO event_id_uuid;
ALTER TABLE public.passengers RENAME COLUMN legacy_id TO id;
ALTER TABLE public.passengers RENAME COLUMN legacy_vehicle_id TO vehicle_id;
ALTER TABLE public.passengers RENAME COLUMN legacy_event_id TO event_id;

-- service_attendance
ALTER TABLE public.service_attendance RENAME COLUMN service_id TO service_id_uuid;
ALTER TABLE public.service_attendance RENAME COLUMN member_id TO member_id_uuid;
ALTER TABLE public.service_attendance RENAME COLUMN legacy_service_id TO service_id;
ALTER TABLE public.service_attendance RENAME COLUMN legacy_member_id TO member_id;

-- souls
ALTER TABLE public.souls RENAME COLUMN vehicle_id TO vehicle_id_uuid;
ALTER TABLE public.souls RENAME COLUMN station_id TO station_id_uuid;
ALTER TABLE public.souls RENAME COLUMN event_id TO event_id_uuid;
ALTER TABLE public.souls RENAME COLUMN legacy_vehicle_id TO vehicle_id;
ALTER TABLE public.souls RENAME COLUMN legacy_station_id TO station_id;
ALTER TABLE public.souls RENAME COLUMN legacy_event_id TO event_id;

-- incidents
ALTER TABLE public.incidents RENAME COLUMN service_id TO service_id_uuid;
ALTER TABLE public.incidents RENAME COLUMN legacy_service_id TO service_id;

-- volunteer_attendance
ALTER TABLE public.volunteer_attendance RENAME COLUMN service_id TO service_id_uuid;
ALTER TABLE public.volunteer_attendance RENAME COLUMN legacy_service_id TO service_id;


-- 4. RESTORE PRIMARY KEY CONSTRAINTS (TEXT-BASED)
-- -----------------------------------------------------------------------------
ALTER TABLE public.members ADD PRIMARY KEY (id);
ALTER TABLE public.ministry_events ADD PRIMARY KEY (id);
ALTER TABLE public.pickup_stations ADD PRIMARY KEY (id);
ALTER TABLE public.vehicles ADD PRIMARY KEY (id);
ALTER TABLE public.passengers ADD PRIMARY KEY (id);


-- 5. RESTORE LEGACY TEXT-BASED FOREIGN KEYS
-- -----------------------------------------------------------------------------
ALTER TABLE public.pickup_stations ADD CONSTRAINT pickup_stations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.ministry_events(id) ON DELETE CASCADE;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.pickup_stations(id) ON DELETE CASCADE;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.ministry_events(id) ON DELETE CASCADE;
ALTER TABLE public.passengers ADD CONSTRAINT passengers_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;
ALTER TABLE public.service_attendance ADD CONSTRAINT service_attendance_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;
ALTER TABLE public.service_attendance ADD CONSTRAINT service_attendance_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.ministry_events(id) ON DELETE CASCADE;

COMMIT;
