
-- Passengers Forensic Audit (Type-Safe)

-- 1. Check Column Data Types (The Source of Truth)
SELECT 
    column_name, 
    data_type, 
    udt_name,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'passengers'
    AND column_name IN ('id', 'vehicle_id', 'station_id', 'event_id', 'legacy_vehicle_id');

-- 2. Incoming Foreign Keys (Who references passengers?)
SELECT 
    tc.table_name, 
    kcu.column_name, 
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND kcu.table_name = 'passengers';

-- 3. Outgoing Foreign Keys (Who does passengers reference?)
SELECT 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'passengers';

-- 4. Check 'souls' table dependency on vehicles (Ambiguity Check)
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'souls' 
    AND column_name LIKE '%vehicle%';
