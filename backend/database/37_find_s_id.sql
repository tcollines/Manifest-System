-- DIAGNOSTIC 37: Find the 's-' ID
-- We need to know which table/column holds 's-1767105409588' causing the UUID cast error.

-- 1. Check Ministry Events (ID)
SELECT count(*) as "Events with s-" FROM ministry_events WHERE id LIKE 's-%';

-- 2. Check Pickup Stations (ID)
SELECT count(*) as "Stations with s- ID" FROM pickup_stations WHERE id LIKE 's-%';
-- Check Pickup Stations (Event ID reference)
SELECT count(*) as "Stations with s- EventID" FROM pickup_stations WHERE event_id LIKE 's-%';

-- 3. Check Service Attendance (Service ID)
SELECT count(*) as "Attendance with s-" FROM service_attendance WHERE service_id LIKE 's-%';

-- 4. Check Souls (Source ID)
SELECT count(*) as "Souls with s-" FROM souls WHERE source_id LIKE 's-%';
