
-- Check Departments PK Schema
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('users', 'report_submissions', 'departments') 
    AND column_name IN ('id', 'department_id');
