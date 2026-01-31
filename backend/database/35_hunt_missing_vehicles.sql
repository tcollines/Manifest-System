-- DIAGNOSTIC 35: Hunt for Missing Vehicles
-- This lists EVERY Event ID (real or ghost) that has vehicles attached.

SELECT 
    s.event_id as "Event ID stored in Station",
    e.title as "Event Title (If found)",
    count(v.id) as "Vehicle Count",
    CASE 
        WHEN e.id IS NOT NULL THEN '✅ Valid Event' 
        ELSE '❌ ORPHANED / GHOST ID' 
    END as "Status"
FROM vehicles v
JOIN pickup_stations s ON v.station_id = s.id
LEFT JOIN ministry_events e ON s.event_id::text = e.id::text
GROUP BY s.event_id, e.title, e.id
ORDER BY count(v.id) DESC;
