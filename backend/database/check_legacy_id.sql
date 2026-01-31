-- DIAGNOSTIC: Check 'e-' ID
SELECT * FROM ministry_events WHERE id = 'e-1766929270205';

-- Check for data linked to this ID
SELECT count(*) as attendance FROM service_attendance WHERE service_id = 'e-1766929270205';
SELECT count(*) as vehicles FROM pickup_stations s JOIN vehicles v ON s.id = v.station_id WHERE s.event_id = 'e-1766929270205';

-- Check for potential duplicate UUID event for "Night of Prayer"
SELECT * FROM ministry_events 
WHERE title ILIKE '%Night of Prayer%' 
  AND id != 'e-1766929270205';
