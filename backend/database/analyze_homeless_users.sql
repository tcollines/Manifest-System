
-- Analyze Roles for Users with Missing Department
SELECT 
    role, 
    COUNT(*) as count 
FROM 
    users 
WHERE 
    department_id IS NULL 
    OR department_id = '' 
GROUP BY 
    role;
