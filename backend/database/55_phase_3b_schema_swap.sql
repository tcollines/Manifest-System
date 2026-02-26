
-- 55_phase_3b_schema_swap.sql
-- Corrected Phase 3B: Schema Authority Flip
-- Goal: Promote native UUID columns to authoritative names (id, event_id, etc.)
-- Goal: Rename legacy TEXT columns to legacy_* (EXCLUDING souls.source_id)

BEGIN;

-- 1. DROP ALL CORE FOREIGN KEY CONSTRAINTS
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.pickup_stations DROP CONSTRAINT IF EXISTS pickup_stations_event_id_fkey;
ALTER TABLE IF EXISTS public.pickup_stations DROP CONSTRAINT IF EXISTS fk_pickup_stations_event_uuid;

ALTER TABLE IF EXISTS public.vehicles DROP CONSTRAINT IF EXISTS vehicles_station_id_fkey;
ALTER TABLE IF EXISTS public.vehicles DROP CONSTRAINT IF EXISTS vehicles_event_id_fkey;
ALTER TABLE IF EXISTS public.vehicles DROP CONSTRAINT IF EXISTS fk_vehicles_station_uuid;
ALTER TABLE IF EXISTS public.vehicles DROP CONSTRAINT IF EXISTS fk_vehicles_event_uuid;

ALTER TABLE IF EXISTS public.passengers DROP CONSTRAINT IF EXISTS passengers_vehicle_id_fkey;
ALTER TABLE IF EXISTS public.passengers DROP CONSTRAINT IF EXISTS passengers_event_id_fkey;
ALTER TABLE IF EXISTS public.passengers DROP CONSTRAINT IF EXISTS fk_passengers_vehicle_uuid;
ALTER TABLE IF EXISTS public.passengers DROP CONSTRAINT IF EXISTS fk_passengers_event_uuid;

ALTER TABLE IF EXISTS public.service_attendance DROP CONSTRAINT IF EXISTS service_attendance_member_id_fkey;
ALTER TABLE IF EXISTS public.service_attendance DROP CONSTRAINT IF EXISTS service_attendance_service_id_fkey;
ALTER TABLE IF EXISTS public.service_attendance DROP CONSTRAINT IF EXISTS fk_service_attendance_member_uuid;
ALTER TABLE IF EXISTS public.service_attendance DROP CONSTRAINT IF EXISTS fk_service_attendance_service_uuid;

ALTER TABLE IF EXISTS public.volunteer_attendance DROP CONSTRAINT IF EXISTS volunteer_attendance_service_id_fkey;
ALTER TABLE IF EXISTS public.volunteer_attendance DROP CONSTRAINT IF EXISTS fk_volunteer_attendance_service_uuid;

ALTER TABLE IF EXISTS public.incidents DROP CONSTRAINT IF EXISTS incidents_service_id_fkey;
ALTER TABLE IF EXISTS public.incidents DROP CONSTRAINT IF EXISTS fk_incidents_service_uuid;

ALTER TABLE IF EXISTS public.souls DROP CONSTRAINT IF EXISTS souls_source_id_fkey;
ALTER TABLE IF EXISTS public.souls DROP CONSTRAINT IF EXISTS souls_event_id_fkey;
ALTER TABLE IF EXISTS public.souls DROP CONSTRAINT IF EXISTS fk_souls_event_uuid;
ALTER TABLE IF EXISTS public.souls DROP CONSTRAINT IF EXISTS fk_souls_station_uuid;
ALTER TABLE IF EXISTS public.souls DROP CONSTRAINT IF EXISTS fk_souls_vehicle_uuid;

ALTER TABLE IF EXISTS public.personal_vehicles DROP CONSTRAINT IF EXISTS fk_personal_vehicles_event_uuid;


-- 2. DROP PRIMARY KEY CONSTRAINTS
-- -----------------------------------------------------------------------------
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_pkey CASCADE;
ALTER TABLE public.ministry_events DROP CONSTRAINT IF EXISTS ministry_events_pkey CASCADE;
ALTER TABLE public.pickup_stations DROP CONSTRAINT IF EXISTS pickup_stations_pkey CASCADE;
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_pkey CASCADE;
ALTER TABLE public.passengers DROP CONSTRAINT IF EXISTS passengers_pkey CASCADE;


-- 3. RENAME COLUMNS (Legacy -> legacy_*, Shadow -> Authoritative)
-- -----------------------------------------------------------------------------

-- members
ALTER TABLE public.members RENAME COLUMN id TO legacy_id;
ALTER TABLE public.members RENAME COLUMN id_uuid TO id;

-- ministry_events
ALTER TABLE public.ministry_events RENAME COLUMN id TO legacy_id;
ALTER TABLE public.ministry_events RENAME COLUMN id_uuid TO id;

-- service_attendance
ALTER TABLE public.service_attendance RENAME COLUMN service_id TO legacy_service_id;
ALTER TABLE public.service_attendance RENAME COLUMN member_id TO legacy_member_id;
ALTER TABLE public.service_attendance RENAME COLUMN service_id_uuid TO service_id;
ALTER TABLE public.service_attendance RENAME COLUMN member_id_uuid TO member_id;

-- pickup_stations
ALTER TABLE public.pickup_stations RENAME COLUMN id TO legacy_id;
ALTER TABLE public.pickup_stations RENAME COLUMN event_id TO legacy_event_id;
ALTER TABLE public.pickup_stations RENAME COLUMN id_uuid TO id;
ALTER TABLE public.pickup_stations RENAME COLUMN event_id_uuid TO event_id;

-- vehicles
ALTER TABLE public.vehicles RENAME COLUMN id TO legacy_id;
ALTER TABLE public.vehicles RENAME COLUMN station_id TO legacy_station_id;
ALTER TABLE public.vehicles RENAME COLUMN event_id TO legacy_event_id;
ALTER TABLE public.vehicles RENAME COLUMN id_uuid TO id;
ALTER TABLE public.vehicles RENAME COLUMN station_id_uuid TO station_id;
ALTER TABLE public.vehicles RENAME COLUMN event_id_uuid TO event_id;

-- passengers
ALTER TABLE public.passengers RENAME COLUMN id TO legacy_id;
ALTER TABLE public.passengers RENAME COLUMN vehicle_id TO legacy_vehicle_id;
ALTER TABLE public.passengers RENAME COLUMN event_id TO legacy_event_id;
ALTER TABLE public.passengers RENAME COLUMN id_uuid TO id;
ALTER TABLE public.passengers RENAME COLUMN vehicle_id_uuid TO vehicle_id;
ALTER TABLE public.passengers RENAME COLUMN event_id_uuid TO event_id;

-- souls (station_id, vehicle_id, event_id)
-- souls.source_id is UNTOUCHED per requirement.
ALTER TABLE public.souls RENAME COLUMN event_id TO legacy_event_id;
ALTER TABLE public.souls RENAME COLUMN station_id TO legacy_station_id;
ALTER TABLE public.souls RENAME COLUMN vehicle_id TO legacy_vehicle_id;
ALTER TABLE public.souls RENAME COLUMN event_id_uuid TO event_id;
ALTER TABLE public.souls RENAME COLUMN station_id_uuid TO station_id;
ALTER TABLE public.souls RENAME COLUMN vehicle_id_uuid TO vehicle_id;

-- incidents
ALTER TABLE public.incidents RENAME COLUMN service_id TO legacy_service_id;
ALTER TABLE public.incidents RENAME COLUMN service_id_uuid TO service_id;

-- volunteer_attendance
ALTER TABLE public.volunteer_attendance RENAME COLUMN service_id TO legacy_service_id;
ALTER TABLE public.volunteer_attendance RENAME COLUMN service_id_uuid TO service_id;


-- 4. RECREATE PRIMARY KEY CONSTRAINTS (UUID-BASED)
-- -----------------------------------------------------------------------------
ALTER TABLE public.members ADD PRIMARY KEY (id);
ALTER TABLE public.ministry_events ADD PRIMARY KEY (id);
ALTER TABLE public.pickup_stations ADD PRIMARY KEY (id);
ALTER TABLE public.vehicles ADD PRIMARY KEY (id);
ALTER TABLE public.passengers ADD PRIMARY KEY (id);


-- 5. RECREATE CORE FOREIGN KEY CONSTRAINTS (UUID-BASED)
-- -----------------------------------------------------------------------------
ALTER TABLE public.pickup_stations
  ADD CONSTRAINT fk_pickup_stations_event
  FOREIGN KEY (event_id) REFERENCES public.ministry_events(id) ON DELETE CASCADE;

ALTER TABLE public.vehicles
  ADD CONSTRAINT fk_vehicles_station
  FOREIGN KEY (station_id) REFERENCES public.pickup_stations(id) ON DELETE CASCADE;

ALTER TABLE public.vehicles
  ADD CONSTRAINT fk_vehicles_event
  FOREIGN KEY (event_id) REFERENCES public.ministry_events(id) ON DELETE CASCADE;

ALTER TABLE public.passengers
  ADD CONSTRAINT fk_passengers_vehicle
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;

ALTER TABLE public.passengers
  ADD CONSTRAINT fk_passengers_event
  FOREIGN KEY (event_id) REFERENCES public.ministry_events(id) ON DELETE CASCADE;

ALTER TABLE public.service_attendance
  ADD CONSTRAINT fk_service_attendance_member
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE public.service_attendance
  ADD CONSTRAINT fk_service_attendance_service
  FOREIGN KEY (service_id) REFERENCES public.ministry_events(id) ON DELETE CASCADE;

ALTER TABLE public.volunteer_attendance
  ADD CONSTRAINT fk_volunteer_attendance_service
  FOREIGN KEY (service_id) REFERENCES public.ministry_events(id) ON DELETE CASCADE;

ALTER TABLE public.incidents
  ADD CONSTRAINT fk_incidents_service
  FOREIGN KEY (service_id) REFERENCES public.ministry_events(id) ON DELETE CASCADE;

ALTER TABLE public.souls
  ADD CONSTRAINT fk_souls_event
  FOREIGN KEY (event_id) REFERENCES public.ministry_events(id) ON DELETE RESTRICT;

ALTER TABLE public.souls
  ADD CONSTRAINT fk_souls_station
  FOREIGN KEY (station_id) REFERENCES public.pickup_stations(id) ON DELETE SET NULL;

ALTER TABLE public.souls
  ADD CONSTRAINT fk_souls_vehicle
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


-- 6. DROP REDUNDANT SHADOW INDICES
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_members_id_uuid;
DROP INDEX IF EXISTS idx_ministry_events_id_uuid;
DROP INDEX IF EXISTS idx_pickup_stations_id_uuid;
DROP INDEX IF EXISTS idx_pickup_stations_event_id_uuid;
DROP INDEX IF EXISTS idx_vehicles_id_uuid;
DROP INDEX IF EXISTS idx_vehicles_station_id_uuid;
DROP INDEX IF EXISTS idx_vehicles_event_id_uuid;
DROP INDEX IF EXISTS idx_passengers_id_uuid;
DROP INDEX IF EXISTS idx_passengers_vehicle_id_uuid;
DROP INDEX IF EXISTS idx_passengers_event_id_uuid;
DROP INDEX IF EXISTS idx_service_attendance_member_id_uuid;
DROP INDEX IF EXISTS idx_service_attendance_service_id_uuid;
DROP INDEX IF EXISTS idx_volunteer_attendance_service_id_uuid;
DROP INDEX IF EXISTS idx_incidents_service_id_uuid;
DROP INDEX IF EXISTS idx_souls_event_id_uuid;
DROP INDEX IF EXISTS idx_souls_station_id_uuid;
DROP INDEX IF EXISTS idx_souls_vehicle_id_uuid;

COMMIT;
