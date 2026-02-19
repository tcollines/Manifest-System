
-- Personal Vehicles Authority Flip ROLLBACK
-- Reverts schema to Shadow Column state

BEGIN;

-- 1. Vehicle Attendance: Revert
ALTER TABLE public.vehicle_attendance DROP CONSTRAINT IF EXISTS fk_vehicle_attendance_vehicle_id;
ALTER TABLE public.vehicle_attendance RENAME COLUMN vehicle_id TO vehicle_id_uuid;
ALTER TABLE public.vehicle_attendance ADD COLUMN vehicle_id TEXT;
-- Attempt to restore text IDs from personal_vehicles (via UUID join)
UPDATE public.vehicle_attendance va
SET vehicle_id = pv.id_text_legacy_deprecated
FROM public.personal_vehicles pv
WHERE va.vehicle_id_uuid = pv.id;

-- 2. Personal Vehicles: Revert
ALTER TABLE public.personal_vehicles DROP CONSTRAINT IF EXISTS personal_vehicles_pkey;
ALTER TABLE public.personal_vehicles RENAME COLUMN id TO id_uuid;
ALTER TABLE public.personal_vehicles RENAME COLUMN id_text_legacy_deprecated TO id;

ALTER TABLE public.personal_vehicles ADD CONSTRAINT personal_vehicles_pkey PRIMARY KEY (id);

-- 3. Re-add Shadow FK Constraint if needed
-- (Optional, implies we go back to shadow state)

COMMIT;
