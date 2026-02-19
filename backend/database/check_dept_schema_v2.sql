
-- Check Departments Schema (V2)
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'departments';

-- Check content (just ID and Name for now)
SELECT * FROM departments LIMIT 5;
