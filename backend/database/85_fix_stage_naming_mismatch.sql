-- Migration 85: Fix Stage Naming Mismatch
-- Goal: Fix the 'State Jump Error' by aligning legacy 'Registration' stage with 'Onboarding'
-- and migrating existing records.

BEGIN;

-- 1. Update get_stage_weight to treat 'Registration' as 'Onboarding' (Weight 1)
CREATE OR REPLACE FUNCTION get_stage_weight(stage TEXT)
RETURNS INT IMMUTABLE AS $$
BEGIN
    RETURN CASE stage
        WHEN 'Onboarding' THEN 1
        WHEN 'Registration' THEN 1  -- Legacy compatibility
        WHEN 'Verifying' THEN 2
        WHEN 'RegApproval' THEN 3
        WHEN 'FinanceApproval' THEN 4
        WHEN 'Transit' THEN 5
        WHEN 'Arrived' THEN 6
        WHEN 'Completed' THEN 7
        ELSE 0 -- Unknown stage
    END;
END;
$$ LANGUAGE plpgsql;

-- 2. Migrate existing 'Registration' records to 'Onboarding'
-- This ensures they are on the correct, type-safe stage name.
UPDATE public.vehicles 
SET current_stage = 'Onboarding' 
WHERE current_stage = 'Registration';

-- 3. Update any NULL stages to 'Onboarding' as well for consistency
UPDATE public.vehicles 
SET current_stage = 'Onboarding' 
WHERE current_stage IS NULL;

COMMIT;
