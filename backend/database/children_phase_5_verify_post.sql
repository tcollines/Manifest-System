-- PHASE 5: POST-FLIP VERIFICATION
-- Run this AFTER `children_authority_flip.sql` to confirm success.

BEGIN;

DO $$
DECLARE
    col_type TEXT;
    pk_constraint TEXT;
    fk_constraint TEXT;
    uuid_sample UUID;
    legacy_sample TEXT;
BEGIN
    RAISE NOTICE '--- STARTING POST-FLIP VERIFICATION ---';

    -- 1. Verify children.id is now UUID
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'id';
    
    IF col_type = 'uuid' THEN
        RAISE NOTICE 'PASSED: children.id is UUID.';
    ELSE
        RAISE EXCEPTION 'FAIL: children.id is % (Expected uuid)', col_type;
    END IF;

    -- 2. Verify incidents.child_id is now UUID
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'child_id';
    
    IF col_type = 'uuid' THEN
        RAISE NOTICE 'PASSED: incidents.child_id is UUID.';
    ELSE
        RAISE EXCEPTION 'FAIL: incidents.child_id is % (Expected uuid)', col_type;
    END IF;

    -- 3. Verify Primary Key exists on children(id)
    SELECT constraint_name INTO pk_constraint
    FROM information_schema.table_constraints
    WHERE table_name = 'children' AND constraint_type = 'PRIMARY KEY';

    IF pk_constraint IS NOT NULL THEN
        RAISE NOTICE 'PASSED: Primary Key exists on children (%s).', pk_constraint;
    ELSE
        RAISE EXCEPTION 'FAIL: No Primary Key found on children.';
    END IF;

    -- 4. Verify Foreign Key Linkage
    SELECT constraint_name INTO fk_constraint
    FROM information_schema.table_constraints
    WHERE table_name = 'incidents' AND constraint_type = 'FOREIGN KEY';
    -- This is a weak check (any FK), but specific check is header.
    -- Better: Check if foreign key exists referencing children(id)
    
    PERFORM 1 FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'incidents' AND tc.constraint_name = 'fk_incidents_child';
    
    IF FOUND THEN
        RAISE NOTICE 'PASSED: Foreign Key fk_incidents_child exists.';
    ELSE
        RAISE EXCEPTION 'FAIL: Foreign Key fk_incidents_child NOT found.';
    END IF;

    -- 5. Data Sampling
    SELECT id INTO uuid_sample FROM public.children LIMIT 1;
    SELECT id_legacy_deprecated INTO legacy_sample FROM public.children LIMIT 1;
    
    RAISE NOTICE 'Sample Data Check:';
    RAISE NOTICE '  New ID (UUID): %', uuid_sample;
    RAISE NOTICE '  Old ID (Legacy): %', legacy_sample;

    IF uuid_sample IS NULL OR legacy_sample IS NULL THEN
         RAISE WARNING 'WARNING: Sample data yielded NULLs. Check table content.';
    ELSE
         RAISE NOTICE 'PASSED: Data samples retrieved successfully.';
    END IF;

    RAISE NOTICE '--- POST-FLIP VERIFICATION SUCCESSFUL ---';
END $$;

ROLLBACK; -- Verification only, no changes
