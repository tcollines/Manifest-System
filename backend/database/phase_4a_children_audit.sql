-- 1. Row Count and Pattern Analysis
SELECT 
    COUNT(*) as total_children,
    COUNT(CASE WHEN id LIKE 'c-bulk-%' THEN 1 END) as bulk_pattern_count,
    COUNT(CASE WHEN id IS NULL THEN 1 END) as null_id_count,
    MIN(LENGTH(id)) as min_id_length,
    MAX(LENGTH(id)) as max_id_length
FROM children;

-- 2. Inspect Sample IDs
SELECT id FROM children LIMIT 10;

-- 3. Find Tables Referencing 'children' (Foreign Keys)
SELECT 
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE ccu.table_name = 'children';

-- 4. Check for Ad-Hoc/Implicit References (Columns named 'child_id' but no FK)
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE column_name LIKE '%child_id%' 
AND table_name != 'children'
AND table_schema = 'public';
