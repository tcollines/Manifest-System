
-- Verify Schema Types (Should be UUID)
SELECT 
    table_name, 
    column_name, 
    data_type, 
    udt_name
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('users', 'report_submissions', 'departments') 
    AND column_name IN ('id', 'department_id')
ORDER BY 
    table_name, column_name;
