-- DIAGNOSTIC 40: Check for Remaining Duplicates
-- This script groups events by Title and Date to find any that still have >1 entry.

SELECT 
    title, 
    date, 
    count(*) as "Duplicate Count",
    array_agg(id) as "Event IDs",
    array_agg(created_at) as "Created At Times"
FROM ministry_events
GROUP BY title, date
HAVING count(*) > 1
ORDER BY count(*) DESC;
