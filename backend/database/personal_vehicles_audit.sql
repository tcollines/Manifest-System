
-- Personal Vehicles Forensic Audit
-- 1. Data Profile
SELECT 
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE id ~* '^[0-9a-f-]{36}$') AS valid_uuid,
  COUNT(*) FILTER (WHERE id !~* '^[0-9a-f-]{36}$') AS legacy_count
FROM personal_vehicles;

-- 2. Foreign Key Dependencies
SELECT 
    tc.table_name, 
    kcu.column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'personal_vehicles'
  AND ccu.table_schema = 'public';

-- 3. Suspected "Soft" Dependencies (Scanning for 'vehicle_id' references)
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name LIKE '%vehicle_id%' 
AND table_name != 'personal_vehicles'
AND table_schema = 'public';
