
-- 52_harden_uuid_schema.sql
-- Stage 1: Shadow UUID Column Migration (REVISED for Data Safety)
-- Goal: Introduce parallel native UUID columns. Use safe casts to handle junk data/empty strings.

BEGIN;

-- PHASE A: SHADOW COLUMN CREATION & BACKFILL
-- -----------------------------------------------------------------------------

-- Helper logic: We only backfill if the string matches the UUID pattern.
-- Otherwise, we leave the shadow column as NULL.

-- 1. Table: members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS id_uuid uuid;
UPDATE public.members SET id_uuid = CASE 
    WHEN id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' 
    THEN id::uuid ELSE NULL END 
WHERE id_uuid IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_id_uuid ON public.members(id_uuid);

-- 2. Table: ministry_events
ALTER TABLE public.ministry_events ADD COLUMN IF NOT EXISTS id_uuid uuid;
UPDATE public.ministry_events SET id_uuid = CASE 
    WHEN id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' 
    THEN id::uuid ELSE NULL END 
WHERE id_uuid IS NULL;
CREATE INDEX IF NOT EXISTS idx_ministry_events_id_uuid ON public.ministry_events(id_uuid);

-- 3. Table: pickup_stations
ALTER TABLE public.pickup_stations ADD COLUMN IF NOT EXISTS id_uuid uuid;
ALTER TABLE public.pickup_stations ADD COLUMN IF NOT EXISTS event_id_uuid uuid;
UPDATE public.pickup_stations SET 
    id_uuid = CASE WHEN id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN id::uuid ELSE NULL END,
    event_id_uuid = CASE WHEN event_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN event_id::uuid ELSE NULL END
WHERE (id_uuid IS NULL AND id IS NOT NULL) OR (event_id_uuid IS NULL AND event_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_pickup_stations_id_uuid ON public.pickup_stations(id_uuid);
CREATE INDEX IF NOT EXISTS idx_pickup_stations_event_id_uuid ON public.pickup_stations(event_id_uuid);

-- 4. Table: vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS id_uuid uuid;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS station_id_uuid uuid;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS event_id_uuid uuid;
UPDATE public.vehicles SET 
    id_uuid = CASE WHEN id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN id::uuid ELSE NULL END,
    station_id_uuid = CASE WHEN station_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN station_id::uuid ELSE NULL END,
    event_id_uuid = CASE WHEN event_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN event_id::uuid ELSE NULL END
WHERE id_uuid IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_id_uuid ON public.vehicles(id_uuid);
CREATE INDEX IF NOT EXISTS idx_vehicles_station_id_uuid ON public.vehicles(station_id_uuid);
CREATE INDEX IF NOT EXISTS idx_vehicles_event_id_uuid ON public.vehicles(event_id_uuid);

-- 5. Table: passengers
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS id_uuid uuid;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS vehicle_id_uuid uuid;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS event_id_uuid uuid;
UPDATE public.passengers SET 
    id_uuid = CASE WHEN id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN id::uuid ELSE NULL END,
    vehicle_id_uuid = CASE WHEN vehicle_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN vehicle_id::uuid ELSE NULL END,
    event_id_uuid = CASE WHEN event_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN event_id::uuid ELSE NULL END
WHERE id_uuid IS NULL;
CREATE INDEX IF NOT EXISTS idx_passengers_id_uuid ON public.passengers(id_uuid);
CREATE INDEX IF NOT EXISTS idx_passengers_vehicle_id_uuid ON public.passengers(vehicle_id_uuid);
CREATE INDEX IF NOT EXISTS idx_passengers_event_id_uuid ON public.passengers(event_id_uuid);

-- 6. Table: service_attendance
ALTER TABLE public.service_attendance ADD COLUMN IF NOT EXISTS member_id_uuid uuid;
ALTER TABLE public.service_attendance ADD COLUMN IF NOT EXISTS service_id_uuid uuid;
UPDATE public.service_attendance SET 
    member_id_uuid = CASE WHEN member_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN member_id::uuid ELSE NULL END,
    service_id_uuid = CASE WHEN service_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN service_id::uuid ELSE NULL END
WHERE member_id_uuid IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_attendance_member_id_uuid ON public.service_attendance(member_id_uuid);
CREATE INDEX IF NOT EXISTS idx_service_attendance_service_id_uuid ON public.service_attendance(service_id_uuid);

-- 7. Table: volunteer_attendance
-- id is already uuid in most cases, but we establish service_id_uuid
ALTER TABLE public.volunteer_attendance ADD COLUMN IF NOT EXISTS service_id_uuid uuid;
UPDATE public.volunteer_attendance SET 
    service_id_uuid = CASE WHEN service_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN service_id::uuid ELSE NULL END
WHERE service_id_uuid IS NULL;
CREATE INDEX IF NOT EXISTS idx_volunteer_attendance_service_id_uuid ON public.volunteer_attendance(service_id_uuid);

-- 8. Table: incidents
-- id is already uuid
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS service_id_uuid uuid;
UPDATE public.incidents SET 
    service_id_uuid = CASE WHEN service_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN service_id::uuid ELSE NULL END
WHERE service_id_uuid IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_service_id_uuid ON public.incidents(service_id_uuid);

-- 9. Table: souls
-- id is already uuid
ALTER TABLE public.souls ADD COLUMN IF NOT EXISTS event_id_uuid uuid;
ALTER TABLE public.souls ADD COLUMN IF NOT EXISTS station_id_uuid uuid;
ALTER TABLE public.souls ADD COLUMN IF NOT EXISTS vehicle_id_uuid uuid;
UPDATE public.souls SET 
    event_id_uuid = CASE WHEN event_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN event_id::uuid ELSE NULL END,
    station_id_uuid = CASE WHEN station_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN station_id::uuid ELSE NULL END,
    vehicle_id_uuid = CASE WHEN vehicle_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN vehicle_id::uuid ELSE NULL END
WHERE event_id_uuid IS NULL;
CREATE INDEX IF NOT EXISTS idx_souls_event_id_uuid ON public.souls(event_id_uuid);
CREATE INDEX IF NOT EXISTS idx_souls_station_id_uuid ON public.souls(station_id_uuid);
CREATE INDEX IF NOT EXISTS idx_souls_vehicle_id_uuid ON public.souls(vehicle_id_uuid);

-- 10. Table: personal_vehicles
ALTER TABLE public.personal_vehicles ADD COLUMN IF NOT EXISTS current_service_id_uuid uuid;
UPDATE public.personal_vehicles SET 
    current_service_id_uuid = CASE WHEN current_service_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN current_service_id::uuid ELSE NULL END
WHERE current_service_id_uuid IS NULL;
CREATE INDEX IF NOT EXISTS idx_personal_vehicles_service_id_uuid ON public.personal_vehicles(current_service_id_uuid);


-- PHASE B: PARALLEL UUID RELATIONSHIPS
-- -----------------------------------------------------------------------------

-- Ensure unique indices exist on source shadowed IDs for FK reference
-- (We only do this for core referenced tables)
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_id_uuid_unique ON public.members(id_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ministry_events_id_uuid_unique ON public.ministry_events(id_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pickup_stations_id_uuid_unique ON public.pickup_stations(id_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_id_uuid_unique ON public.vehicles(id_uuid);

-- Restore parallel foreign keys
-- Note: These constraints will ignore NULLs (un-backfilled legacy data)

ALTER TABLE public.pickup_stations
  ADD CONSTRAINT fk_pickup_stations_event_uuid
  FOREIGN KEY (event_id_uuid) 
  REFERENCES public.ministry_events(id_uuid)
  ON DELETE CASCADE;

ALTER TABLE public.vehicles
  ADD CONSTRAINT fk_vehicles_station_uuid
  FOREIGN KEY (station_id_uuid)
  REFERENCES public.pickup_stations(id_uuid)
  ON DELETE CASCADE;

ALTER TABLE public.vehicles
  ADD CONSTRAINT fk_vehicles_event_uuid
  FOREIGN KEY (event_id_uuid) 
  REFERENCES public.ministry_events(id_uuid)
  ON DELETE CASCADE;

ALTER TABLE public.passengers
  ADD CONSTRAINT fk_passengers_vehicle_uuid
  FOREIGN KEY (vehicle_id_uuid)
  REFERENCES public.vehicles(id_uuid)
  ON DELETE CASCADE;

ALTER TABLE public.passengers
  ADD CONSTRAINT fk_passengers_event_uuid
  FOREIGN KEY (event_id_uuid) 
  REFERENCES public.ministry_events(id_uuid)
  ON DELETE CASCADE;

ALTER TABLE public.service_attendance
  ADD CONSTRAINT fk_service_attendance_member_uuid
  FOREIGN KEY (member_id_uuid)
  REFERENCES public.members(id_uuid)
  ON DELETE CASCADE;

ALTER TABLE public.service_attendance
  ADD CONSTRAINT fk_service_attendance_service_uuid
  FOREIGN KEY (service_id_uuid)
  REFERENCES public.ministry_events(id_uuid)
  ON DELETE CASCADE;

ALTER TABLE public.volunteer_attendance
  ADD CONSTRAINT fk_volunteer_attendance_service_uuid
  FOREIGN KEY (service_id_uuid)
  REFERENCES public.ministry_events(id_uuid)
  ON DELETE CASCADE;

ALTER TABLE public.incidents
  ADD CONSTRAINT fk_incidents_service_uuid
  FOREIGN KEY (service_id_uuid)
  REFERENCES public.ministry_events(id_uuid)
  ON DELETE CASCADE;

ALTER TABLE public.souls
  ADD CONSTRAINT fk_souls_event_uuid
  FOREIGN KEY (event_id_uuid)
  REFERENCES public.ministry_events(id_uuid)
  ON DELETE RESTRICT;

ALTER TABLE public.souls
  ADD CONSTRAINT fk_souls_station_uuid
  FOREIGN KEY (station_id_uuid)
  REFERENCES public.pickup_stations(id_uuid)
  ON DELETE SET NULL;

ALTER TABLE public.souls
  ADD CONSTRAINT fk_souls_vehicle_uuid
  FOREIGN KEY (vehicle_id_uuid)
  REFERENCES public.vehicles(id_uuid)
  ON DELETE SET NULL;

ALTER TABLE public.personal_vehicles
  ADD CONSTRAINT fk_personal_vehicles_event_uuid
  FOREIGN KEY (current_service_id_uuid)
  REFERENCES public.ministry_events(id_uuid)
  ON DELETE SET NULL;

COMMIT;
