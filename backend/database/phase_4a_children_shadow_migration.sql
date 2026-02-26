-- Phase 2: Children Table Shadow Column Migration

-- 1. Add Shadow Columns to 'children'
ALTER TABLE public.children 
ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS legacy_id TEXT;

-- 2. Backfill 'legacy_id' with current 'id'
UPDATE public.children 
SET legacy_id = id 
WHERE legacy_id IS NULL;

-- 3. Add Shadow Column to 'incidents' (Dependency)
ALTER TABLE public.incidents
ADD COLUMN IF NOT EXISTS child_id_uuid UUID;

-- 4. Backfill 'incidents.child_id_uuid'
UPDATE public.incidents i
SET child_id_uuid = c.id_uuid
FROM public.children c
WHERE i.child_id = c.id
AND i.child_id_uuid IS NULL;

-- 5. Add Index for performance on new UUID columns
CREATE INDEX IF NOT EXISTS idx_children_id_uuid ON public.children(id_uuid);
CREATE INDEX IF NOT EXISTS idx_incidents_child_id_uuid ON public.incidents(child_id_uuid);
