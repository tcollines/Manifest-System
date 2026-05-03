-- ============================================================
-- Migration 61: Standardize Status Constants
-- ============================================================

BEGIN;

-- 1. Backup snapshots (Recommended)
CREATE TABLE IF NOT EXISTS requisitions_backup_61 AS
SELECT * FROM public.requisitions;

CREATE TABLE IF NOT EXISTS workplans_backup_61 AS
SELECT * FROM public.monthly_workplans;

-- 2. Drop existing constraint if it exists
ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_status_check;

-- 3. Normalize values in requisitions
UPDATE public.requisitions
SET status = CASE
  WHEN status IN ('Pending Team Leader', 'PENDING_TEAM_LEADER') THEN 'TL_APPROVAL'
  WHEN status IN ('Pending Finance', 'PENDING_FINANCE') THEN 'FINANCE_BATCH'
  WHEN status IN ('Pending') THEN 'PENDING'
  WHEN status IN ('Approved') THEN 'APPROVED'
  WHEN status IN ('Paid') THEN 'PAID'
  WHEN status IN ('Rejected') THEN 'REJECTED'
  WHEN status IN ('Draft') THEN 'DRAFT'
  ELSE status
END;

-- 4. Normalize values in monthly_workplans
UPDATE public.monthly_workplans
SET status = CASE
  WHEN status IN ('Draft') THEN 'DRAFT'
  WHEN status IN ('Submitted') THEN 'ADMIN_REVIEW'
  WHEN status IN ('TL Review', 'TL_Review') THEN 'TL_REVIEW'
  WHEN status IN ('Finalized') THEN 'FINALIZED'
  ELSE status
END;

-- 5. Add strict constraints to prevent future drift permanently
ALTER TABLE public.requisitions
ADD CONSTRAINT requisition_status_check
CHECK (status IN ('DRAFT','PENDING','FINANCE_BATCH','TL_APPROVAL','APPROVED','PAID','REJECTED'));

ALTER TABLE public.monthly_workplans DROP CONSTRAINT IF EXISTS workplan_status_check;
ALTER TABLE public.monthly_workplans
ADD CONSTRAINT workplan_status_check
CHECK (status IN ('DRAFT', 'ADMIN_REVIEW', 'TL_REVIEW', 'FINALIZED'));

COMMIT;
