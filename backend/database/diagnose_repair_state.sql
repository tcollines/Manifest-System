-- DIAGNOSIS: Check Post-Repair State
-- Run this to understand why duplicates exist and where the data is.

-- 1. Check if any 'evt-%' IDs survived
SELECT count(*) as "Remaining Temp Events", 'Should be 0' as "Expected" 
FROM ministry_events WHERE id LIKE 'evt-%';

-- 2. Check for Duplicate Events (Same Title + Date)
SELECT title, date, count(*) as "Count", array_agg(id) as "IDs"
FROM ministry_events
GROUP BY title, date
HAVING count(*) > 1;

-- 3. Check Data Linkage for specific "Duplicate" Events
-- Replace the IDs below with the UUIDs found in step 2 for a specific event (e.g., Night of Prayer)
-- Example: 'Night of Prayer' might have ID A and ID B. 
-- We want to see which one holds the data.

WITH target_events AS (
    SELECT id, title FROM ministry_events 
    WHERE title ILIKE '%Prayer%' OR title ILIKE '%School%' -- Adjust filter as needed
)
SELECT 
    e.title,
    e.id, 
    (SELECT count(*) FROM pickup_stations WHERE event_id::text = e.id::text) as "Stations",
    (SELECT count(*) FROM service_attendance WHERE service_id::text = e.id::text) as "Attendance",
    (SELECT count(*) FROM vehicles v JOIN pickup_stations s ON v.station_id = s.id WHERE s.event_id::text = e.id::text) as "Vehicles",
    (SELECT count(*) FROM transactions WHERE event_id::text = e.id::text) as "Finance"
FROM target_events e;

-- 4. Check for Orphaned Data (Data linked to IDs that don't exist in ministry_events)
SELECT 'Pickup Stations' as table_name, count(*) as orphans 
FROM pickup_stations 
WHERE event_id::text NOT IN (SELECT id::text FROM ministry_events);

SELECT 'Service Attendance' as table_name, count(*) as orphans 
FROM service_attendance 
WHERE service_id::text NOT IN (SELECT id::text FROM ministry_events);
