
-- Verify PK Types of Referenced Tables

SELECT 
    table_name,
    column_name, 
    data_type,
    udt_name
FROM 
    information_schema.columns 
WHERE 
    column_name = 'id'
    AND table_name IN ('ministry_events', 'pickup_stations', 'vehicles', 'department_requests', 'transactions');
