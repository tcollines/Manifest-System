-- ============================================================
-- Migration 63: Database Hardening and Audit Logging
-- ============================================================

BEGIN;

-- 1. Strict Constraints
-- Ensure workplan_item_id on requisitions actually points to a valid item
-- Note: It is already specified as REFERENCES public.workplan_items(id) in 59_create_workflow_engine.sql
-- We will enforce NOT NULL where applicable (if a requisition is WORKPLAN type, it MUST have a workplan_item_id)
ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_workplan_item_check;
ALTER TABLE public.requisitions
ADD CONSTRAINT requisitions_workplan_item_check
CHECK (
    (type = 'WORKPLAN' AND workplan_item_id IS NOT NULL) OR
    (type = 'ADHOC' AND workplan_item_id IS NULL)
);

-- Update workplan_items status CHECK constraint to match exact casing
ALTER TABLE public.workplan_items DROP CONSTRAINT IF EXISTS workplan_items_status_check;
ALTER TABLE public.workplan_items
ADD CONSTRAINT workplan_items_status_check
CHECK (status IN ('PENDING', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'TL_APPROVED', 'TL_ADJUSTED', 'TL_REJECTED', 'FINALIZED'));


-- 2. Audit Log Tables
CREATE TABLE IF NOT EXISTS public.workplan_item_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id UUID,
    item_id UUID NOT NULL REFERENCES public.workplan_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workplan_item_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users on workplan_item_logs"
    ON public.workplan_item_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.requisition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id UUID,
    requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.requisition_batches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    CHECK (requisition_id IS NOT NULL OR batch_id IS NOT NULL)
);

ALTER TABLE public.requisition_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users on requisition_logs"
    ON public.requisition_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
