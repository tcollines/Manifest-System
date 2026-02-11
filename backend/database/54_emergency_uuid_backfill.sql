
-- 54_emergency_uuid_backfill.sql
-- Goal: Ensure 100% UUID coverage for all shadow columns before Phase 3B.
-- Context: Fixes ERROR 23502 (NOT NULL violation) during PK promotion.

BEGIN;

-- 1. BACKFILL MISSING PRIMARY KEY UUIDS
-- -----------------------------------------------------------------------------

-- members
UPDATE public.members 
SET id_uuid = gen_random_uuid() 
WHERE id_uuid IS NULL;

-- ministry_events
UPDATE public.ministry_events 
SET id_uuid = gen_random_uuid() 
WHERE id_uuid IS NULL;

-- pickup_stations
UPDATE public.pickup_stations 
SET id_uuid = gen_random_uuid() 
WHERE id_uuid IS NULL;

-- vehicles
UPDATE public.vehicles 
SET id_uuid = gen_random_uuid() 
WHERE id_uuid IS NULL;

-- passengers
UPDATE public.passengers 
SET id_uuid = gen_random_uuid() 
WHERE id_uuid IS NULL;


-- 2. BACKFILL MISSING FOREIGN KEY UUIDS (RESOLVE FROM PARENT id_uuid)
-- -----------------------------------------------------------------------------

-- pickup_stations (event_id_uuid)
UPDATE public.pickup_stations s
SET event_id_uuid = e.id_uuid
FROM public.ministry_events e
WHERE s.event_id = e.id AND s.event_id_uuid IS NULL;

-- vehicles (station_id_uuid, event_id_uuid)
UPDATE public.vehicles v
SET station_id_uuid = s.id_uuid
FROM public.pickup_stations s
WHERE v.station_id = s.id AND v.station_id_uuid IS NULL;

UPDATE public.vehicles v
SET event_id_uuid = e.id_uuid
FROM public.ministry_events e
WHERE v.event_id = e.id AND v.event_id_uuid IS NULL;

-- passengers (vehicle_id_uuid, event_id_uuid)
UPDATE public.passengers p
SET vehicle_id_uuid = v.id_uuid
FROM public.vehicles v
WHERE p.vehicle_id = v.id AND p.vehicle_id_uuid IS NULL;

UPDATE public.passengers p
SET event_id_uuid = e.id_uuid
FROM public.ministry_events e
WHERE p.event_id = e.id AND p.event_id_uuid IS NULL;

-- souls (event_id_uuid, station_id_uuid, vehicle_id_uuid)
UPDATE public.souls s
SET event_id_uuid = e.id_uuid
FROM public.ministry_events e
WHERE s.event_id = e.id AND s.event_id_uuid IS NULL;

UPDATE public.souls s
SET station_id_uuid = st.id_uuid
FROM public.pickup_stations st
WHERE s.station_id = st.id AND s.station_id_uuid IS NULL;

UPDATE public.souls s
SET vehicle_id_uuid = v.id_uuid
FROM public.vehicles v
WHERE s.vehicle_id = v.id AND s.vehicle_id_uuid IS NULL;

-- service_attendance (member_id_uuid, service_id_uuid)
UPDATE public.service_attendance a
SET member_id_uuid = m.id_uuid
FROM public.members m
WHERE a.member_id = m.id AND a.member_id_uuid IS NULL;

UPDATE public.service_attendance a
SET service_id_uuid = e.id_uuid
FROM public.ministry_events e
WHERE a.service_id = e.id AND a.service_id_uuid IS NULL;

COMMIT;
