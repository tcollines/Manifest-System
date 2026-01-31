-- Check actual data for the event
-- Event UUID: 35f15cae-122b-4cd6-a972-e50ff16a695d

-- 1. Check Pickup Stations (Linkage to Vehicles)
SELECT id, name FROM pickup_stations WHERE event_id::text = '35f15cae-122b-4cd6-a972-e50ff16a695d';

-- 2. Check Vehicles (Linkage to Passengers)
-- We need station IDs first, but let's check count roughly
SELECT COUNT(*) as vehicle_count FROM vehicles v
JOIN pickup_stations s ON v.station_id = s.id
WHERE s.event_id::text = '35f15cae-122b-4cd6-a972-e50ff16a695d';

-- 3. Check Service Attendance
SELECT COUNT(*) as attendance_count FROM service_attendance 
WHERE service_id::text = '35f15cae-122b-4cd6-a972-e50ff16a695d';

-- 4. Check Souls
SELECT COUNT(*) as souls_count FROM souls 
WHERE source_id = '35f15cae-122b-4cd6-a972-e50ff16a695d' AND source_type = 'Service';

-- 5. Check Personal Vehicles
SELECT COUNT(*) as pv_count FROM personal_vehicles 
WHERE attended_service_ids @> ARRAY['35f15cae-122b-4cd6-a972-e50ff16a695d'];
