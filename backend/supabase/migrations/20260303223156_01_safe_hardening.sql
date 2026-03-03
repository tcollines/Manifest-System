-- 1. Functional Unique Index for Number Plates (Case and whitespace insensitive)
-- This prevents duplicates at the database index level before triggers even fire.
CREATE UNIQUE INDEX IF NOT EXISTS unique_vehicle_plate_per_event 
ON public.vehicles (event_id, lower(trim(number_plate)));

CREATE UNIQUE INDEX IF NOT EXISTS unique_personal_vehicle_plate_per_event 
ON public.personal_vehicles (event_id, lower(trim(number_plate)));


-- 2. Normalization Trigger
-- While the index prevents duplicates, this trigger actively cleans the data 
-- being inserted so it looks standard when queried.
CREATE OR REPLACE FUNCTION normalize_number_plate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.number_plate IS NOT NULL THEN
        NEW.number_plate = UPPER(TRIM(NEW.number_plate));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_number_plate ON public.vehicles;
CREATE TRIGGER trg_normalize_number_plate
    BEFORE INSERT OR UPDATE OF number_plate ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION normalize_number_plate();

DROP TRIGGER IF EXISTS trg_normalize_personal_number_plate ON public.personal_vehicles;
CREATE TRIGGER trg_normalize_personal_number_plate
    BEFORE INSERT OR UPDATE OF number_plate ON public.personal_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION normalize_number_plate();


-- 3. Add Version Column for Optimistic Locking
-- We add the column but do NOT yet enforce it or trigger its increment.
-- The frontend must be updated to pass `{ version: currentVersion }` first.
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE public.passengers 
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE public.pickup_stations 
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
