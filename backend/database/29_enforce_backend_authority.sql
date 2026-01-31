-- MIGRATION: Enforce Backend Authority (Prevent evt-*)
-- Objective: Permanently block the insertion of 'evt-%' IDs in ministry_events.
-- Prerequisite: 28_repair_historical_events.sql must be run first to clear existing evt-* IDs.

-- 1. Add CHECK Constraint
-- This ensures that the ID column (which is TEXT) does NOT start with 'evt-'
-- Valid UUIDs (e.g., '123e4567-...') will pass.
ALTER TABLE ministry_events
ADD CONSTRAINT check_event_id_format 
CHECK (id NOT LIKE 'evt-%');

-- 2. (Optional) Create function to validate UUID format strictly if desired
-- For now, blocking 'evt-' is sufficient to enforce the architectural decision.

COMMENT ON CONSTRAINT check_event_id_format ON ministry_events IS 'Prevents temporary frontline IDs from being persisted. Backend must generate UUIDs.';
