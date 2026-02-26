-- Phase 3: Dual-Write Implementation

-- 1. Create Function to Sync Incidents (Frontend writes legacy child_id, we autofill child_id_uuid)
CREATE OR REPLACE FUNCTION sync_incident_child_uuid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.child_id IS NOT NULL AND NEW.child_id_uuid IS NULL THEN
        SELECT id_uuid INTO NEW.child_id_uuid FROM public.children WHERE id = NEW.child_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_incident_child_uuid
BEFORE INSERT OR UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION sync_incident_child_uuid();

-- 2. Create Function to Sync Children (Ensure legacy_id is always populated)
CREATE OR REPLACE FUNCTION sync_children_ids()
RETURNS TRIGGER AS $$
BEGIN
    -- If inserting with ID (text) but no legacy_id, copy ID to legacy_id
    IF NEW.id IS NOT NULL AND NEW.legacy_id IS NULL THEN
        NEW.legacy_id := NEW.id;
    END IF;
    
    -- If id_uuid is missing, let default gen_random_uuid() handle it (already default)
    -- If we wanted to enforce it being returned, we can do it here, but default is fine.
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_children_ids
BEFORE INSERT OR UPDATE ON public.children
FOR EACH ROW
EXECUTE FUNCTION sync_children_ids();

-- 3. Update 'submit_child_entry' RPC to handle Dual Write expectations
-- Note: We are NOT changing the signature to require UUID yet, to avoid breaking frontend.
-- We implicitly rely on the table's defaults and the trigger above.
-- But if we want to be explicit, we can update the function. 
-- For now, the TRIGGER is the most robust way to ensure dual-write without changing RPC signature if we don't strictly need to pass UUID from frontend yet.
-- However, confirming the RPC exists is good practice.

-- (Optional) Verification that RPC uses standard INSERT which trips the trigger:
-- The RPC 'submit_child_entry' likely does: INSERT INTO children (...) VALUES (...);
-- This will fire 'trg_sync_children_ids', ensuring 'legacy_id' is populated.
-- 'id_uuid' has a DEFAULT gen_random_uuid(), so it will be populated.

-- Result:
-- 1. Frontend calls RPC with 'id' (legacy).
-- 2. RPC inserts into 'children'.
-- 3. Trigger sets 'legacy_id' = 'id'.
-- 4. DB sets 'id_uuid' = gen_random_uuid().
-- 5. Dual Write Complete.

-- Same for Incidents:
-- 1. Frontend inserts into 'incidents' with 'child_id'.
-- 2. Trigger looks up 'child_id' in 'children'.
-- 3. Sets 'child_id_uuid'.
-- 4. Dual Write Complete.
