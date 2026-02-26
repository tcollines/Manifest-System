-- UUID Type Enforcement Readiness Audit
-- Targets: users.id, personal_vehicles.id

BEGIN;

DO $$
DECLARE
    -- Users Stats
    users_total INT;
    users_valid_uuid INT;
    users_null INT;
    users_invalid_sample TEXT;
    
    -- PV Stats
    pv_total INT;
    pv_valid_uuid INT;
    pv_null INT;
    pv_invalid_sample TEXT;
    
    -- Regex for strict UUID (v4 variant mostly, but allowing all standard 8-4-4-4-12 hex)
    uuid_regex TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
    RAISE NOTICE '--- AUDIT START ---';
    RAISE NOTICE 'Regex used: %', uuid_regex;

    -- 1. USERS Audit
    SELECT COUNT(*) INTO users_total FROM public.users;
    SELECT COUNT(*) INTO users_null FROM public.users WHERE id IS NULL;
    SELECT COUNT(*) INTO users_valid_uuid FROM public.users WHERE id ~* uuid_regex;
    
    SELECT id INTO users_invalid_sample 
    FROM public.users 
    WHERE id IS NOT NULL AND id !~* uuid_regex 
    LIMIT 1;

    RAISE NOTICE '--- TABLE: users ---';
    RAISE NOTICE 'Total Rows: %', users_total;
    RAISE NOTICE 'Valid UUIDs: %', users_valid_uuid;
    RAISE NOTICE 'NULLs: %', users_null;
    IF users_invalid_sample IS NOT NULL THEN
        RAISE NOTICE 'INVALID SAMPLE: %', users_invalid_sample;
    ELSE
        RAISE NOTICE 'Status: 100%% UUID Compliant (Data)';
    END IF;

    -- 2. PERSONAL_VEHICLES Audit
    SELECT COUNT(*) INTO pv_total FROM public.personal_vehicles;
    SELECT COUNT(*) INTO pv_null FROM public.personal_vehicles WHERE id IS NULL;
    SELECT COUNT(*) INTO pv_valid_uuid FROM public.personal_vehicles WHERE id ~* uuid_regex;
    
    SELECT id INTO pv_invalid_sample 
    FROM public.personal_vehicles 
    WHERE id IS NOT NULL AND id !~* uuid_regex 
    LIMIT 1;

    RAISE NOTICE '--- TABLE: personal_vehicles ---';
    RAISE NOTICE 'Total Rows: %', pv_total;
    RAISE NOTICE 'Valid UUIDs: %', pv_valid_uuid;
    RAISE NOTICE 'NULLs: %', pv_null;
    IF pv_invalid_sample IS NOT NULL THEN
        RAISE NOTICE 'INVALID SAMPLE: %', pv_invalid_sample;
    ELSE
        RAISE NOTICE 'Status: 100%% UUID Compliant (Data)';
    END IF;

END $$;

-- 3. CONSTRAINT & DEPENDENCY AUDIT (Information Schema)
RAISE NOTICE '--- DEPENDENCY MAPPING ---';

-- Users Dependencies (Who references users.id?)
SELECT 
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
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'users';

-- Personal Vehicles Dependencies
SELECT 
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
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'personal_vehicles';

ROLLBACK;
