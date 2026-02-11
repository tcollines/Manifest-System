
-- 61_fix_attendance_constraints.sql
-- Goal: Align unique constraints with native UUID columns.
-- Context: After Phase 3B, the legacy unique constraint followed the renamed legacy_* columns.
-- This prevents ON CONFLICT (member_id, service_id) from working.

BEGIN;

-- 1. Identify and Drop legacy unique constraint if it exists
-- It's often named 'unique_service_attendance' or 'service_attendance_member_id_service_id_key'
ALTER TABLE public.service_attendance DROP CONSTRAINT IF EXISTS service_attendance_member_id_service_id_key;
ALTER TABLE public.service_attendance DROP CONSTRAINT IF EXISTS unique_service_attendance;
ALTER TABLE public.service_attendance DROP CONSTRAINT IF EXISTS service_attendance_legacy_member_id_legacy_service_id_key;

-- 2. Create New Unique Constraint on native UUID columns
-- This enables ON CONFLICT (member_id, service_id)
ALTER TABLE public.service_attendance 
  ADD CONSTRAINT unique_attendance_uuid UNIQUE (member_id, service_id);

COMMIT;
