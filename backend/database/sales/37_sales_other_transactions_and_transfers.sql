-- ============================================================
-- Migration 37: Other Transactions and Fund Transfers
-- Author: Manifest System
-- Phase: 1 (Money Management)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sales_other_transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id UUID NOT NULL,
    account_id  UUID NOT NULL REFERENCES public.sales_money_accounts(id),
    txn_date    DATE NOT NULL,
    direction   TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
    amount      NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    reference   TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    created_by  TEXT
);

CREATE INDEX IF NOT EXISTS idx_sales_other_txns_manifest_date ON public.sales_other_transactions(manifest_id, txn_date);
CREATE INDEX IF NOT EXISTS idx_sales_other_txns_account ON public.sales_other_transactions(account_id);

ALTER TABLE public.sales_other_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users on sales_other_transactions" 
    ON public.sales_other_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service_role on sales_other_transactions" 
    ON public.sales_other_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.sales_fund_transfers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id     UUID NOT NULL,
    transfer_date   DATE NOT NULL,
    from_account_id UUID NOT NULL REFERENCES public.sales_money_accounts(id),
    to_account_id   UUID NOT NULL REFERENCES public.sales_money_accounts(id),
    amount          NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    charges         NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (charges >= 0),
    reference       TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    created_by      TEXT,
    CHECK (from_account_id <> to_account_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_fund_transfers_manifest_date ON public.sales_fund_transfers(manifest_id, transfer_date);
CREATE INDEX IF NOT EXISTS idx_sales_fund_transfers_from_account ON public.sales_fund_transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_sales_fund_transfers_to_account ON public.sales_fund_transfers(to_account_id);

ALTER TABLE public.sales_fund_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users on sales_fund_transfers" 
    ON public.sales_fund_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service_role on sales_fund_transfers" 
    ON public.sales_fund_transfers FOR ALL TO service_role USING (true) WITH CHECK (true);
