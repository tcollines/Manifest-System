
-- Personal Vehicles Authority Flip
-- Phase 8: Schema Swap (Text -> UUID)

BEGIN;

-- 1. Vehicle Attendance: Handle FK Dependency First
-- Drop legacy text column and rename shadow UUID column
ALTER TABLE public.vehicle_attendance DROP COLUMN IF EXISTS vehicle_id;
ALTER TABLE public.vehicle_attendance RENAME COLUMN vehicle_id_uuid TO vehicle_id;

-- 2. Personal Vehicles: Swap PK
-- Drop legacy PK constraint
ALTER TABLE public.personal_vehicles DROP CONSTRAINT IF EXISTS personal_vehicles_pkey;

-- Rename legacy ID for safety (or drop if backed up)
ALTER TABLE public.personal_vehicles RENAME COLUMN id TO id_text_legacy_deprecated;

-- Rename UUID column to 'id'
ALTER TABLE public.personal_vehicles RENAME COLUMN id_uuid TO id;

-- Set new PK
ALTER TABLE public.personal_vehicles ADD CONSTRAINT personal_vehicles_pkey PRIMARY KEY (id);

-- 3. Re-establish FK on Vehicle Attendance
-- It references the NEW 'id' (UUID) of personal_vehicles
ALTER TABLE public.vehicle_attendance 
ADD CONSTRAINT fk_vehicle_attendance_vehicle_id 
FOREIGN KEY (vehicle_id) 
REFERENCES public.personal_vehicles(id);

COMMIT;
