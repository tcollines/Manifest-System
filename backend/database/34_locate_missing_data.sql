-- DIAGNOSTIC 34: Locate Missing Data (Where are the 20 vehicles?)

-- 1. Check all Event IDs that have Vehicles attached
-- This helps us find the "Hidden" ID that holds your data (11 or 20 vehicles).
SELECT 
    s.event_id, 
    e.title, 
    e.date,
    count(v.id) as "Vehicle Count"
FROM vehicles v
JOIN pickup_stations s ON v.station_id = s.id
LEFT JOIN ministry_events e ON s.event_id::text = e.id::text
GROUP BY s.event_id, e.title, e.date
ORDER BY count(v.id) DESC;

-- 2. Check Night of Prayer specifically again
SELECT * FROM ministry_events WHERE title ILIKE '%Night of Prayer%';
