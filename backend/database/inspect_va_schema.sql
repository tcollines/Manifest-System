
-- Inspect vehicle_attendance schema
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'vehicle_attendance';
