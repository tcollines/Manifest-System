
-- 60_fix_legacy_nullability.sql
-- Goal: Ensure legacy_id and legacy_* columns are nullable.
-- Context: When 'id' was renamed to 'legacy_id' in Phase 3B, it carried over the NOT NULL constraint.
-- New records (without legacy fallbacks) are currently failing insertion.

BEGIN;

-- 1. Relax legacy primary key constraints
ALTER TABLE public.members ALTER COLUMN legacy_id DROP NOT NULL;
ALTER TABLE public.ministry_events ALTER COLUMN legacy_id DROP NOT NULL;
ALTER TABLE public.pickup_stations ALTER COLUMN legacy_id DROP NOT NULL;
ALTER TABLE public.vehicles ALTER COLUMN legacy_id DROP NOT NULL;
ALTER TABLE public.passengers ALTER COLUMN legacy_id DROP NOT NULL;

-- 2. Relax legacy relationship constraints
ALTER TABLE public.service_attendance 
  ALTER COLUMN legacy_service_id DROP NOT NULL,
  ALTER COLUMN legacy_member_id DROP NOT NULL;

ALTER TABLE public.pickup_stations ALTER COLUMN legacy_event_id DROP NOT NULL;

ALTER TABLE public.vehicles 
  ALTER COLUMN legacy_station_id DROP NOT NULL,
  ALTER COLUMN legacy_event_id DROP NOT NULL;

ALTER TABLE public.passengers 
  ALTER COLUMN legacy_vehicle_id DROP NOT NULL,
  ALTER COLUMN legacy_event_id DROP NOT NULL;

ALTER TABLE public.souls 
  ALTER COLUMN legacy_event_id DROP NOT NULL,
  ALTER COLUMN legacy_station_id DROP NOT NULL,
  ALTER COLUMN legacy_vehicle_id DROP NOT NULL;

ALTER TABLE public.incidents ALTER COLUMN legacy_service_id DROP NOT NULL;
ALTER TABLE public.volunteer_attendance ALTER COLUMN legacy_service_id DROP NOT NULL;

COMMIT;
