
-- List RLS Policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check 
FROM 
    pg_policies 
WHERE 
    tablename IN ('report_submissions', 'users', 'departments');
