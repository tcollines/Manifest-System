-- Migration 27: Procurement Payments
-- Author: Manifest System
-- Date: 2026-05-24

-- 1. Add new columns to sales_procurement_requests
ALTER TABLE public.sales_procurement_requests ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.sales_procurement_requests ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.sales_procurement_requests ADD COLUMN IF NOT EXISTS balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.sales_procurement_requests ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID'));

-- 2. Migrate existing records: Calculate total_amount from existing items
UPDATE public.sales_procurement_requests spr
SET total_amount = COALESCE((
    SELECT SUM(expected_cost * quantity_ordered)
    FROM public.sales_procurement_request_items spri
    WHERE spri.request_id = spr.id
), 0);

-- Update balance_due and payment_status based on the newly calculated total_amount
UPDATE public.sales_procurement_requests
SET balance_due = total_amount,
    payment_status = CASE 
        WHEN total_amount = 0 THEN 'PAID' -- if cost is 0, consider it paid (no balance)
        ELSE 'UNPAID'
    END;

-- 3. Create sales_procurement_payments table
CREATE TABLE IF NOT EXISTS public.sales_procurement_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id TEXT NOT NULL,
    procurement_request_id UUID NOT NULL REFERENCES public.sales_procurement_requests(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.sales_suppliers(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Mobile Money', 'Card', 'Bank Transfer')),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    transaction_reference TEXT,
    notes TEXT,
    recorded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Setup RLS
ALTER TABLE public.sales_procurement_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable ALL for authenticated users on sales_procurement_payments" ON public.sales_procurement_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
