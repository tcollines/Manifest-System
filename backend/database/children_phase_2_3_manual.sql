-- CHILDREN TABLE UUID MIGRATION - PHASES 2 & 3
-- Execute this in the Supabase SQL Editor

BEGIN;

-- PHASE 2: SHADOW COLUMNS
-- 1. Add id_uuid and legacy_id to children
ALTER TABLE public.children 
ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS legacy_id TEXT;

-- 2. Backfill legacy_id (Copy current ID)
UPDATE public.children 
SET legacy_id = id 
WHERE legacy_id IS NULL;

-- 3. Add child_id_uuid to incidents (Dependency)
ALTER TABLE public.incidents
ADD COLUMN IF NOT EXISTS child_id_uuid UUID;

-- 4. Backfill incidents.child_id_uuid
UPDATE public.incidents i
SET child_id_uuid = c.id_uuid
FROM public.children c
WHERE i.child_id = c.id
AND i.child_id_uuid IS NULL;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_children_id_uuid ON public.children(id_uuid);
CREATE INDEX IF NOT EXISTS idx_incidents_child_id_uuid ON public.incidents(child_id_uuid);


-- PHASE 3: DUAL-WRITE TRIGGERS
-- 6. Trigger to Auto-Populate child_id_uuid on Incidents
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

-- 7. Trigger to Ensure legacy_id is populated on Children
CREATE OR REPLACE FUNCTION sync_children_ids()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id IS NOT NULL AND NEW.legacy_id IS NULL THEN
        NEW.legacy_id := NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_children_ids
BEFORE INSERT OR UPDATE ON public.children
FOR EACH ROW
EXECUTE FUNCTION sync_children_ids();

COMMIT;
