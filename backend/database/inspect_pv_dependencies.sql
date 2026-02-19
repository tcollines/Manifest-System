
-- Inspect Constraints on 'passengers' and 'souls' to see where 'vehicle_id' points
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('passengers', 'souls', 'vehicle_attendance');

-- Check if 'vehicle_attendance' exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'vehicle_attendance';
