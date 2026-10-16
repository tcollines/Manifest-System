-- ============================================================
-- Migration 35: Sales Refunds Table
-- Author: Manifest System
-- Phase: 1 (Money Management)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sales_refunds (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id    UUID NOT NULL,
    order_id       UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    amount         NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    account_id     UUID NOT NULL REFERENCES public.sales_money_accounts(id),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'MTN Mobile Money', 'Airtel Money', 'Bank', 'Card', 'Other')),
    reason         TEXT,
    refunded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by     TEXT
);

CREATE INDEX IF NOT EXISTS idx_sales_refunds_manifest_date ON public.sales_refunds(manifest_id, refunded_at);
CREATE INDEX IF NOT EXISTS idx_sales_refunds_account ON public.sales_refunds(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_refunds_order ON public.sales_refunds(order_id);

-- Enable RLS
ALTER TABLE public.sales_refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users on sales_refunds" 
    ON public.sales_refunds FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service_role on sales_refunds" 
    ON public.sales_refunds FOR ALL TO service_role USING (true) WITH CHECK (true);
