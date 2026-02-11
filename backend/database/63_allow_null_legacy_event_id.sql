
-- 63_allow_null_legacy_event_id.sql
-- Dropping NOT NULL on legacy_event_id.
-- Removed BEGIN/COMMIT to avoid syntax errors in simple execution.

ALTER TABLE public.souls ALTER COLUMN legacy_event_id DROP NOT NULL;
