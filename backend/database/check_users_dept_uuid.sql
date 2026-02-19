
-- Check Users Table for Department UUIDs
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'users' 
    AND column_name IN ('department_id', 'department_uid');

-- Check data sample
SELECT 
    id, 
    department_id, 
    department_uid 
FROM 
    users 
LIMIT 10;

-- Check coverage
SELECT 
    COUNT(*) as total_users,
    COUNT(department_id) as users_with_legacy_dept,
    COUNT(department_uid) as users_with_uuid_dept
FROM 
    users;
