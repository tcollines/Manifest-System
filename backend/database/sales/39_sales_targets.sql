-- ============================================================
-- Migration 39: Sales Targets
-- Author: Manifest System
-- Phase: 1 (Money Management)
-- Note: event_id is added later, in the Events & Preorders phase.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sales_targets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id   UUID NOT NULL,
    period_type   TEXT NOT NULL CHECK (period_type IN ('YEAR', 'MONTH', 'EVENT')),
    period_start  DATE NOT NULL,
    period_end    DATE NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT now(),
    created_by    TEXT,
    CONSTRAINT sales_targets_period_order_check CHECK (period_end >= period_start)
);

-- Uniqueness is enforced only for calendar periods. EVENT targets are deliberately
-- excluded: two events can start on the same day, and they are disambiguated by the
-- event_id column added in the Events & Preorders phase.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_targets_calendar_period
    ON public.sales_targets (manifest_id, period_type, period_start)
    WHERE period_type IN ('YEAR', 'MONTH');

CREATE INDEX IF NOT EXISTS idx_sales_targets_manifest_period
    ON public.sales_targets (manifest_id, period_start, period_end);

ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_targets" ON public.sales_targets;
CREATE POLICY "Enable ALL for authenticated users on sales_targets"
    ON public.sales_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable ALL for service_role on sales_targets" ON public.sales_targets;
CREATE POLICY "Enable ALL for service_role on sales_targets"
    ON public.sales_targets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed the default 2026 annual target (UGX 5,000,000) for every manifest that
-- already has money accounts.
INSERT INTO public.sales_targets (manifest_id, period_type, period_start, period_end, target_amount, notes)
SELECT DISTINCT sma.manifest_id, 'YEAR', DATE '2026-01-01', DATE '2026-12-31', 5000000, 'Seeded default annual target'
FROM public.sales_money_accounts sma
ON CONFLICT DO NOTHING;
