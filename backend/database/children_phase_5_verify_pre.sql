-- PHASE 5: PRE-FLIP VERIFICATION
-- Run this BEFORE the migration to ensure safety.

BEGIN;

DO $$
DECLARE
    null_uuid_count INT;
    null_incident_uuid_count INT;
    orphan_incident_count INT;
    legacy_mismatch_count INT;
BEGIN
    RAISE NOTICE '--- STARTING VERIFICATION ---';

    -- 1. Check for NULL UUIDs in Children
    SELECT COUNT(*) INTO null_uuid_count FROM public.children WHERE id_uuid IS NULL;
    IF null_uuid_count > 0 THEN
        RAISE EXCEPTION 'CRITICAL FAIL: Found % children with NULL id_uuid. Run backfill first.', null_uuid_count;
    ELSE
        RAISE NOTICE 'PASSED: All children have UUIDs.';
    END IF;

    -- 2. Check for NULL UUIDs in Incidents (where legacy ID exists)
    SELECT COUNT(*) INTO null_incident_uuid_count 
    FROM public.incidents 
    WHERE child_id IS NOT NULL AND child_id_uuid IS NULL;
    
    IF null_incident_uuid_count > 0 THEN
        RAISE EXCEPTION 'CRITICAL FAIL: Found % incidents with NULL child_id_uuid. Run backfill first.', null_incident_uuid_count;
    ELSE
        RAISE NOTICE 'PASSED: All linked incidents have UUIDs.';
    END IF;

    -- 3. Check for Orphan Incidents (UUID points to nothing)
    SELECT COUNT(*) INTO orphan_incident_count
    FROM public.incidents i
    LEFT JOIN public.children c ON i.child_id_uuid = c.id_uuid
    WHERE i.child_id_uuid IS NOT NULL AND c.id_uuid IS NULL;

    IF orphan_incident_count > 0 THEN
        RAISE EXCEPTION 'CRITICAL FAIL: Found % orphan incidents (UUID mismatch).', orphan_incident_count;
    ELSE
        RAISE NOTICE 'PASSED: No orphan incidents detected via UUID.';
    END IF;

    -- 4. Verify Legacy ID Integrity (legacy_id should match id)
    SELECT COUNT(*) INTO legacy_mismatch_count
    FROM public.children
    WHERE id IS DISTINCT FROM legacy_id;

    IF legacy_mismatch_count > 0 THEN
        RAISE EXCEPTION 'CRITICAL FAIL: Found % records where legacy_id does not match id. Backfill data is corrupt.', legacy_mismatch_count;
    ELSE
        RAISE NOTICE 'PASSED: legacy_id matches id column perfectly.';
    END IF;

    RAISE NOTICE '--- VERIFICATION SUCCESSFUL: SAFE TO PROCEED ---';
END $$;

ROLLBACK; -- Always rollback verification to change nothing
