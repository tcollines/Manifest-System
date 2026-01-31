-- DIAGNOSTIC 30: List Orphans and Duplicates Details
-- Run this to get the IDs needed for the final merge script.

-- 1. List the distinct Orphan IDs (Data waiting to be adopted)
SELECT DISTINCT service_id as "Orphan ID found in Attendance"
FROM service_attendance 
WHERE service_id::text NOT IN (SELECT id::text FROM ministry_events);

-- 2. List Duplicate Events (Candidates for merging)
SELECT 
    title, 
    date, 
    id as "Event UUID", 
    created_at,
    (SELECT count(*) FROM service_attendance WHERE service_id::text = ministry_events.id::text) as "Linked Attendance"
FROM ministry_events 
WHERE title IN (
    SELECT title FROM ministry_events GROUP BY title, date HAVING count(*) > 1
)
ORDER BY title, date, created_at;
