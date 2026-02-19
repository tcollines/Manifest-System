
-- Comprehensive Audit: Passengers & Souls (Type-Safe Version)

-- 1. Passengers: Check FK column types
SELECT 
    'passengers' as table_name,
    column_name, 
    data_type, 
    udt_name,
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'passengers' 
    AND column_name IN ('station_id', 'event_id', 'vehicle_id', 'legacy_vehicle_id');

-- 2. Souls: Check keys and FK column types
SELECT 
    'souls' as table_name,
    column_name, 
    data_type, 
    udt_name,
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'souls' 
    AND column_name IN ('id', 'vehicle_id', 'event_id', 'station_id', 'captured_by');

-- 3. Souls: Check Constraints (Where do they point?)
SELECT 
    tc.table_name as source_table,
    kcu.column_name as source_column, 
    ccu.table_name AS target_table,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'souls';
