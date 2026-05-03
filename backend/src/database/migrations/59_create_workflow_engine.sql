-- ============================================================
-- Migration 59: State-Driven Workflow Engine
-- Author: Manifest System
-- 
-- Removes raw JSON array from monthly_workplans, replaces it
-- with workplan_items table, introduces Requisition types, 
-- and enforces structured workflow locks and status enums.
-- ============================================================

BEGIN;

-- 1. Alter monthly_workplans to support the new workflow logic
ALTER TABLE public.monthly_workplans 
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Safely drop existing status constraint and apply new one
ALTER TABLE public.monthly_workplans DROP CONSTRAINT IF EXISTS monthly_workplans_status_check;
ALTER TABLE public.monthly_workplans 
  ADD CONSTRAINT monthly_workplans_status_check 
  CHECK (status IN ('Draft', 'Submitted', 'Admin_Review', 'TL_Review', 'Finalized'));

-- 2. Create workplan_items table
CREATE TABLE IF NOT EXISTS public.workplan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id UUID,
    workplan_id UUID NOT NULL REFERENCES public.monthly_workplans(id) ON DELETE CASCADE,
    activity TEXT NOT NULL,
    item TEXT,
    objective TEXT,
    date_needed TEXT,
    duration TEXT DEFAULT 'Once',
    unit_cost NUMERIC(15, 2) DEFAULT 0,
    dept_contribution NUMERIC(15, 2) DEFAULT 0,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'TL_APPROVED', 'TL_ADJUSTED', 'TL_REJECTED', 'FINALIZED')),
    admin_comment TEXT,
    tl_comment TEXT,
    approved_quantity NUMERIC(10, 2),
    approved_amount NUMERIC(15, 2),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workplan_items_workplan ON public.workplan_items(workplan_id);
CREATE INDEX IF NOT EXISTS idx_workplan_items_status ON public.workplan_items(status);

ALTER TABLE public.workplan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users on workplan_items"
    ON public.workplan_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Create requisition_batches table for finance grouping
CREATE TABLE IF NOT EXISTS public.requisition_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number TEXT UNIQUE NOT NULL,
    department_id UUID, 
    created_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'TL_APPROVAL', 'APPROVED', 'PAID', 'REJECTED')),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.requisition_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users on requisition_batches"
    ON public.requisition_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Alter requisitions to link to workplan_items & batches
ALTER TABLE public.requisitions 
  ADD COLUMN IF NOT EXISTS workplan_item_id UUID REFERENCES public.workplan_items(id),
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.requisition_batches(id),
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'ADHOC' CHECK (type IN ('WORKPLAN', 'ADHOC')),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Drop existing status constraint safely & add new required states
ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_status_check;
ALTER TABLE public.requisitions 
  ADD CONSTRAINT requisitions_status_check 
  CHECK (status IN ('Pending', 'Finance Batch', 'TL Approval', 'Approved', 'Paid', 'Rejected'));

-- Enable realtime triggers
ALTER PUBLICATION supabase_realtime ADD TABLE public.workplan_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requisition_batches;

COMMIT;
