
-- Check report_submissions Schema
SELECT 
    column_name, 
    data_type,
    udt_name 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'report_submissions' 
    AND column_name = 'department_id';
