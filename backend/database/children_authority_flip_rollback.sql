-- PHASE 5: ROLLBACK SCRIPT
-- Execute this ONLY if you need to reverse the Authority Flip.
-- This script restores 'id' (Text) as the Primary Key.

BEGIN;

-- 1. Drop New Constraints
ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS fk_incidents_child;
ALTER TABLE public.children DROP CONSTRAINT IF EXISTS children_pkey;

-- 2. Revert Incidents Table
-- Rename current 'child_id' (UUID) back to 'child_id_uuid'
ALTER TABLE public.incidents RENAME COLUMN child_id TO child_id_uuid;
-- Rename 'child_id_legacy' back to 'child_id'
ALTER TABLE public.incidents RENAME COLUMN child_id_legacy TO child_id;

-- 3. Revert Children Table
-- Rename current 'id' (UUID) back to 'id_uuid'
ALTER TABLE public.children RENAME COLUMN id TO id_uuid;
-- Restore 'id_legacy_backup' (or whatever we named it) back to 'id'
-- Note: In the forward migration, we renamed original 'id' to 'id_legacy_deprecated'.
ALTER TABLE public.children RENAME COLUMN id_legacy_deprecated TO id;

-- 4. Restore Primary Key on Text ID
ALTER TABLE public.children ADD CONSTRAINT children_pkey PRIMARY KEY (id);

-- 5. Restore Foreign Keys on Text ID
ALTER TABLE public.incidents 
ADD CONSTRAINT incidents_child_id_fkey 
FOREIGN KEY (child_id) REFERENCES public.children(id);

-- 6. Re-Enable Triggers / Cleanup
-- Drop the V2 trigger as we are reverting to V1 state (implied or existing)
DROP TRIGGER IF EXISTS trg_sync_children_ids_v2 ON public.children;
DROP FUNCTION IF EXISTS public.sync_children_ids_v2;

-- The triggers expect specific column names. If we reverted names, triggers should work if logic is aligned.

COMMIT;
