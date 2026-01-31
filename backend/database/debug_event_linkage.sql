-- Debug Script: Find 'Interschools' event and checking for linked data

-- 1. Find ALL events matching 'School' or 'Prayer'
SELECT id, title, created_at FROM ministry_events 
WHERE title ILIKE '%School%' OR title ILIKE '%Prayer%';

-- 2. Check for ANY data linked to 'evt-%' IDs (Text based linkage)
SELECT count(*) as stations_linked_to_evt FROM pickup_stations 
WHERE event_id::text LIKE 'evt-%';

-- 3. Check for ANY data linked to 'uuid-%' (Standard linkage)
SELECT count(*) as stations_linked_to_uuid FROM pickup_stations 
WHERE event_id::text NOT LIKE 'evt-%';

-- 4. Specific check for the Interschools ID found earlier (evt-1769010837721)
SELECT count(*) as data_for_interschools_evt FROM pickup_stations 
WHERE event_id::text = 'evt-1769010837721';
