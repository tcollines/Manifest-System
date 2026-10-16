-- ============================================================
-- Migration 36: Sales Expense Categories & Expenses
-- Author: Manifest System
-- Phase: 1 (Money Management)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sales_expense_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id UUID NOT NULL,
    name        TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    created_by  TEXT,
    UNIQUE (manifest_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sales_expense_categories_manifest ON public.sales_expense_categories(manifest_id);

ALTER TABLE public.sales_expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users on sales_expense_categories" 
    ON public.sales_expense_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service_role on sales_expense_categories" 
    ON public.sales_expense_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed default categories for existing manifests
DO $$
DECLARE
    m_id UUID;
    cat_name TEXT;
    cats TEXT[] := ARRAY['Transport', 'Packaging', 'Printing', 'Airtime/Data', 'Meals', 'Stall/Venue', 'Bank & MoMo Charges', 'Other'];
BEGIN
    FOR m_id IN 
        SELECT DISTINCT manifest_id FROM public.sales_money_accounts
    LOOP
        FOREACH cat_name IN ARRAY cats LOOP
            INSERT INTO public.sales_expense_categories (manifest_id, name)
            VALUES (m_id, cat_name)
            ON CONFLICT (manifest_id, name) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.sales_expenses (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id    UUID NOT NULL,
    expense_number TEXT NOT NULL,                     -- EXP-2026-0001
    expense_date   DATE NOT NULL,
    description    TEXT NOT NULL,
    category_id    UUID NOT NULL REFERENCES public.sales_expense_categories(id),
    account_id     UUID NOT NULL REFERENCES public.sales_money_accounts(id),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'MTN Mobile Money', 'Airtel Money', 'Bank', 'Card', 'Other')),
    amount         NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    status         TEXT NOT NULL DEFAULT 'PENDING_APPROVAL'
                   CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'VOID')),
    requested_by   TEXT,
    approved_by    TEXT,
    approved_at    TIMESTAMPTZ,
    rejection_note TEXT,
    receipt_url    TEXT,
    notes          TEXT,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now(),
    created_by     TEXT,
    UNIQUE (manifest_id, expense_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_expenses_manifest_date ON public.sales_expenses(manifest_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_sales_expenses_account ON public.sales_expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_expenses_status ON public.sales_expenses(status);
CREATE INDEX IF NOT EXISTS idx_sales_expenses_category ON public.sales_expenses(category_id);

ALTER TABLE public.sales_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users on sales_expenses" 
    ON public.sales_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service_role on sales_expenses" 
    ON public.sales_expenses FOR ALL TO service_role USING (true) WITH CHECK (true);
