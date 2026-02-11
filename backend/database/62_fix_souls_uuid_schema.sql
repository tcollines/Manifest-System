
-- 62_fix_souls_uuid_schema.sql
-- Fixes the schema mismatch where souls.event_id is TEXT while the system expects UUID.
-- Implements Option A: Migrate souls.event_id to UUID and enforce constraints.

BEGIN;

-- 1. Add new UUID column for event_id
ALTER TABLE public.souls ADD COLUMN event_id_uuid uuid;

-- 2. Backfill UUIDs from ministry_events based on legacy_id match
-- This assumes ministry_events.legacy_id matches the current souls.event_id (TEXT)
UPDATE public.souls s
SET event_id_uuid = e.id
FROM public.ministry_events e
WHERE s.event_id = e.legacy_id;

-- 3. Handle cases where souls.event_id might ALREADY be a UUID (from recent fixes)
-- If event_id is significantly formatted like a UUID, try to cast it directly if backfill missed it
UPDATE public.souls
SET event_id_uuid = event_id::uuid
WHERE event_id_uuid IS NULL 
  AND event_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 4. Check for any remaining NULLs. If strict enforcement is required, we might need to delete or assign a default.
-- For now, we will assume all valid souls map to an event. Reporting orphans is wise.
-- (We'll do this in a separate audit script if needed, or check constraints carefully)

-- 5. Enforce NOT NULL on the new UUID column
-- We proceed only if we are confident. If this fails, there are orphans.
ALTER TABLE public.souls ALTER COLUMN event_id_uuid SET NOT NULL;

-- 6. Add Foreign Key Constraint
ALTER TABLE public.souls
ADD CONSTRAINT fk_souls_event_uuid
FOREIGN KEY (event_id_uuid)
REFERENCES public.ministry_events(id)
ON DELETE RESTRICT;

-- 7. Rename columns to swap authority
ALTER TABLE public.souls RENAME COLUMN event_id TO legacy_event_id;
ALTER TABLE public.souls RENAME COLUMN event_id_uuid TO event_id;

-- 8. Final Cleanup (Optional: Drop legacy if sure, but we keep it for safety as per Phase 3C)
-- legacy_event_id remains as TEXT.

COMMIT;
