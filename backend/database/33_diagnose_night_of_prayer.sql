-- DIAGNOSTIC 33: Deep Dive into "Night of Prayer"
-- Run this to find where the 11 vehicles went.

SELECT 
    id, 
    title, 
    date, 
    type, 
    created_at,
    (SELECT count(*) FROM pickup_stations WHERE event_id::text = ministry_events.id::text) as "Stations",
    (SELECT count(*) FROM vehicles v JOIN pickup_stations s ON v.station_id = s.id WHERE s.event_id::text = ministry_events.id::text) as "Vehicles",
    (SELECT count(*) FROM service_attendance WHERE service_id::text = ministry_events.id::text) as "Attendance",
    (SELECT count(*) FROM transactions WHERE event_id::text = ministry_events.id::text) as "Finance"
FROM ministry_events
WHERE title ILIKE '%Night of Prayer%';
