-- ============================================================
-- Sales Phase 1 — combined apply bundle, migrations 34 -> 41
--
-- Paste this whole file into the Supabase SQL editor and run it ONCE.
-- The editor wraps it in a single transaction, so if any statement fails
-- the entire bundle rolls back and nothing is left half-applied.
--
-- !! TAKE A VERIFIED BACKUP FIRST. Migration 34 rewrites payment_method
-- !! in place and cannot be undone by 34_down.
--
-- manifest_id is UUID throughout, matching the live sales tables.
-- Verified on PostgreSQL 18 against a schema generated from the live
-- Supabase OpenAPI spec: apply, 14 RPC runtime assertions, rollback,
-- re-apply — all clean.
-- ============================================================


-- ############################################################
-- ## 34_sales_money_accounts.sql
-- ############################################################

-- ============================================================
-- Migration 34: Sales Money Accounts & Payment Linkage
-- Author: Manifest System
-- Phase: 1 (Money Management)
--
-- !! THIS MIGRATION REWRITES EXISTING DATA IN PLACE. TAKE A BACKUP FIRST. !!
-- Section 5 overwrites payment_method on sales_payments and
-- sales_procurement_payments:
--   'Bank Transfer' -> 'Bank'
--   'Mobile Money'  -> 'Airtel Money' (reference mentions airtel) else 'MTN Mobile Money'
-- The original strings are not preserved anywhere. 34_down CANNOT restore them;
-- it only widens the check constraint to accept both vocabularies. Recovering
-- the original values requires the pre-migration backup.
-- ============================================================

-- 1. Create Money Accounts Table
CREATE TABLE IF NOT EXISTS public.sales_money_accounts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id          UUID NOT NULL,
    name                 TEXT NOT NULL,                 -- 'Cash', 'MTN Mobile Money', 'Airtel Money', 'Bank'
    account_type         TEXT NOT NULL CHECK (account_type IN ('CASH', 'MOBILE_MONEY', 'BANK')),
    provider             TEXT,                          -- 'MTN', 'Airtel', or bank name
    account_number       TEXT,                          -- phone / bank a/c (display last 4 only)
    opening_balance      NUMERIC(15, 2) NOT NULL DEFAULT 0,
    opening_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ DEFAULT now(),
    created_by           TEXT,
    UNIQUE (manifest_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sales_money_accounts_manifest ON public.sales_money_accounts(manifest_id);

-- Enable RLS
ALTER TABLE public.sales_money_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users on sales_money_accounts" 
    ON public.sales_money_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service_role on sales_money_accounts" 
    ON public.sales_money_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Seed Default 4 Accounts for all existing manifests in Sales tables
DO $$
DECLARE
    m_id UUID;
BEGIN
    FOR m_id IN 
        SELECT DISTINCT manifest_id FROM (
            SELECT manifest_id FROM public.sales_products WHERE manifest_id IS NOT NULL
            UNION
            SELECT manifest_id FROM public.sales_orders WHERE manifest_id IS NOT NULL
            UNION
            SELECT manifest_id FROM public.sales_procurement_requests WHERE manifest_id IS NOT NULL
        ) t
    LOOP
        INSERT INTO public.sales_money_accounts (manifest_id, name, account_type, provider, opening_balance)
        VALUES 
            (m_id, 'Cash', 'CASH', NULL, 0),
            (m_id, 'MTN Mobile Money', 'MOBILE_MONEY', 'MTN', 0),
            (m_id, 'Airtel Money', 'MOBILE_MONEY', 'Airtel', 0),
            (m_id, 'Bank', 'BANK', NULL, 0)
        ON CONFLICT (manifest_id, name) DO NOTHING;
    END LOOP;
END $$;

-- 3. Add account_id to sales_payments and sales_procurement_payments
ALTER TABLE public.sales_payments
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.sales_money_accounts(id);

ALTER TABLE public.sales_procurement_payments
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.sales_money_accounts(id);

CREATE INDEX IF NOT EXISTS idx_sales_payments_account ON public.sales_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_procurement_payments_account ON public.sales_procurement_payments(account_id);

-- 4. Drop legacy method check constraints
ALTER TABLE public.sales_procurement_payments
    DROP CONSTRAINT IF EXISTS sales_procurement_payments_payment_method_check;
ALTER TABLE public.sales_payments
    DROP CONSTRAINT IF EXISTS sales_payments_payment_method_check;

-- 5. Backfill historical records
-- Normalize 'Bank Transfer' -> 'Bank'
UPDATE public.sales_procurement_payments
SET payment_method = 'Bank'
WHERE payment_method ILIKE '%Bank Transfer%';

UPDATE public.sales_payments
SET payment_method = 'Bank'
WHERE payment_method ILIKE '%Bank Transfer%';

-- Normalize legacy 'Mobile Money' -> 'Airtel Money' if reference mentions airtel, else 'MTN Mobile Money'
UPDATE public.sales_payments
SET payment_method = CASE 
    WHEN reference ILIKE '%airtel%' THEN 'Airtel Money'
    ELSE 'MTN Mobile Money'
END
WHERE payment_method = 'Mobile Money' OR payment_method = 'MOBILE_MONEY' OR payment_method = 'MOBILE MONEY';

UPDATE public.sales_procurement_payments
SET payment_method = CASE 
    WHEN transaction_reference ILIKE '%airtel%' THEN 'Airtel Money'
    ELSE 'MTN Mobile Money'
END
WHERE payment_method = 'Mobile Money' OR payment_method = 'MOBILE_MONEY' OR payment_method = 'MOBILE MONEY';

-- Set account_id based on payment_method for each record
UPDATE public.sales_payments sp
SET account_id = sma.id
FROM public.sales_money_accounts sma
WHERE sp.manifest_id = sma.manifest_id
  AND (
      (sp.payment_method = 'Cash' AND sma.name = 'Cash') OR
      (sp.payment_method = 'MTN Mobile Money' AND sma.name = 'MTN Mobile Money') OR
      (sp.payment_method = 'Airtel Money' AND sma.name = 'Airtel Money') OR
      ((sp.payment_method = 'Bank' OR sp.payment_method = 'Card') AND sma.name = 'Bank') OR
      (sp.payment_method = 'Other' AND sma.name = 'Cash')
  )
  AND sp.account_id IS NULL;

UPDATE public.sales_procurement_payments spp
SET account_id = sma.id
FROM public.sales_money_accounts sma
WHERE spp.manifest_id = sma.manifest_id
  AND (
      (spp.payment_method = 'Cash' AND sma.name = 'Cash') OR
      (spp.payment_method = 'MTN Mobile Money' AND sma.name = 'MTN Mobile Money') OR
      (spp.payment_method = 'Airtel Money' AND sma.name = 'Airtel Money') OR
      ((spp.payment_method = 'Bank' OR spp.payment_method = 'Card') AND sma.name = 'Bank') OR
      (spp.payment_method = 'Other' AND sma.name = 'Cash')
  )
  AND spp.account_id IS NULL;

-- 6. Apply strict unified CHECK constraints on payment_method
ALTER TABLE public.sales_procurement_payments
    ADD CONSTRAINT sales_procurement_payments_payment_method_check
    CHECK (payment_method IN ('Cash', 'MTN Mobile Money', 'Airtel Money', 'Bank', 'Card', 'Other'));

ALTER TABLE public.sales_payments
    ADD CONSTRAINT sales_payments_payment_method_check
    CHECK (payment_method IN ('Cash', 'MTN Mobile Money', 'Airtel Money', 'Bank', 'Card', 'Other'));


-- ############################################################
-- ## 35_sales_refunds.sql
-- ############################################################

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


-- ############################################################
-- ## 36_sales_expenses.sql
-- ############################################################

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


-- ############################################################
-- ## 37_sales_other_transactions_and_transfers.sql
-- ############################################################

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


-- ############################################################
-- ## 38_sales_period_closes_and_sequences.sql
-- ############################################################

-- ============================================================
-- Migration 38: Period Closes, Sequences & Closed-Period Trigger
-- Author: Manifest System
-- Phase: 1 (Money Management)
-- ============================================================

-- 1. Period Closes Table
CREATE TABLE IF NOT EXISTS public.sales_period_closes (
    manifest_id UUID NOT NULL,
    month       DATE NOT NULL,          -- first day of the month (e.g. 2026-08-01)
    closed_by   TEXT NOT NULL,
    closed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes       TEXT,
    PRIMARY KEY (manifest_id, month)
);

ALTER TABLE public.sales_period_closes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users on sales_period_closes" 
    ON public.sales_period_closes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service_role on sales_period_closes" 
    ON public.sales_period_closes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Number Sequences Table
CREATE TABLE IF NOT EXISTS public.sales_number_sequences (
    manifest_id UUID NOT NULL,
    prefix      TEXT NOT NULL,          -- 'EXP', 'GRN', 'PRE', 'ORD'
    year        INT  NOT NULL,
    last_value  INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (manifest_id, prefix, year)
);

ALTER TABLE public.sales_number_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users on sales_number_sequences" 
    ON public.sales_number_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service_role on sales_number_sequences" 
    ON public.sales_number_sequences FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to get the next formatted document sequence atomically
CREATE OR REPLACE FUNCTION public.sales_get_next_sequence(
    p_manifest_id UUID,
    p_prefix TEXT,
    p_year INT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_next_val INT;
    v_seq_str TEXT;
BEGIN
    INSERT INTO public.sales_number_sequences (manifest_id, prefix, year, last_value)
    VALUES (p_manifest_id, p_prefix, p_year, 1)
    ON CONFLICT (manifest_id, prefix, year)
    DO UPDATE SET last_value = public.sales_number_sequences.last_value + 1
    RETURNING last_value INTO v_next_val;

    v_seq_str := p_prefix || '-' || p_year::text || '-' || lpad(v_next_val::text, 4, '0');
    RETURN v_seq_str;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sales_get_next_sequence(UUID, TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sales_get_next_sequence(UUID, TEXT, INT) TO service_role, authenticated;

-- 3. Trigger Function to Prevent Writes to Closed Periods
CREATE OR REPLACE FUNCTION public.fn_check_sales_closed_period()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_target_date DATE;
    v_manifest_id UUID;
    v_month DATE;
    v_is_closed BOOLEAN;
BEGIN
    -- Determine target date and manifest_id based on table and TG_OP
    IF (TG_OP = 'DELETE') THEN
        v_manifest_id := OLD.manifest_id;
        IF TG_TABLE_NAME = 'sales_payments' THEN
            v_target_date := (OLD.created_at AT TIME ZONE 'Africa/Kampala')::date;
        ELSIF TG_TABLE_NAME = 'sales_refunds' THEN
            v_target_date := (OLD.refunded_at AT TIME ZONE 'Africa/Kampala')::date;
        ELSIF TG_TABLE_NAME = 'sales_procurement_payments' THEN
            v_target_date := (OLD.payment_date AT TIME ZONE 'Africa/Kampala')::date;
        ELSIF TG_TABLE_NAME = 'sales_expenses' THEN
            v_target_date := OLD.expense_date;
        ELSIF TG_TABLE_NAME = 'sales_other_transactions' THEN
            v_target_date := OLD.txn_date;
        ELSIF TG_TABLE_NAME = 'sales_fund_transfers' THEN
            v_target_date := OLD.transfer_date;
        ELSIF TG_TABLE_NAME = 'sales_vendor_sales' THEN
            v_target_date := (OLD.sold_at AT TIME ZONE 'Africa/Kampala')::date;
        ELSIF TG_TABLE_NAME = 'sales_vendor_settlements' THEN
            v_target_date := (OLD.settled_at AT TIME ZONE 'Africa/Kampala')::date;
        ELSE
            v_target_date := CURRENT_DATE;
        END IF;
    ELSE
        v_manifest_id := NEW.manifest_id;
        IF TG_TABLE_NAME = 'sales_payments' THEN
            v_target_date := COALESCE((NEW.created_at AT TIME ZONE 'Africa/Kampala')::date, CURRENT_DATE);
        ELSIF TG_TABLE_NAME = 'sales_refunds' THEN
            v_target_date := COALESCE((NEW.refunded_at AT TIME ZONE 'Africa/Kampala')::date, CURRENT_DATE);
        ELSIF TG_TABLE_NAME = 'sales_procurement_payments' THEN
            v_target_date := COALESCE((NEW.payment_date AT TIME ZONE 'Africa/Kampala')::date, CURRENT_DATE);
        ELSIF TG_TABLE_NAME = 'sales_expenses' THEN
            v_target_date := NEW.expense_date;
        ELSIF TG_TABLE_NAME = 'sales_other_transactions' THEN
            v_target_date := NEW.txn_date;
        ELSIF TG_TABLE_NAME = 'sales_fund_transfers' THEN
            v_target_date := NEW.transfer_date;
        ELSIF TG_TABLE_NAME = 'sales_vendor_sales' THEN
            v_target_date := COALESCE((NEW.sold_at AT TIME ZONE 'Africa/Kampala')::date, CURRENT_DATE);
        ELSIF TG_TABLE_NAME = 'sales_vendor_settlements' THEN
            v_target_date := COALESCE((NEW.settled_at AT TIME ZONE 'Africa/Kampala')::date, CURRENT_DATE);
        ELSE
            v_target_date := CURRENT_DATE;
        END IF;
    END IF;

    -- Calculate first day of the month
    v_month := date_trunc('month', v_target_date)::date;

    SELECT EXISTS (
        SELECT 1 FROM public.sales_period_closes
        WHERE manifest_id = v_manifest_id AND month = v_month
    ) INTO v_is_closed;

    IF v_is_closed THEN
        RAISE EXCEPTION '409: Period closed. Modifications are not allowed for transactions in % (manifest %)', v_month, v_manifest_id
            USING ERRCODE = 'P0001';
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Attach closed-period triggers
DROP TRIGGER IF EXISTS trg_check_closed_sales_payments ON public.sales_payments;
CREATE TRIGGER trg_check_closed_sales_payments
    BEFORE INSERT OR UPDATE OR DELETE ON public.sales_payments
    FOR EACH ROW EXECUTE FUNCTION public.fn_check_sales_closed_period();

DROP TRIGGER IF EXISTS trg_check_closed_sales_refunds ON public.sales_refunds;
CREATE TRIGGER trg_check_closed_sales_refunds
    BEFORE INSERT OR UPDATE OR DELETE ON public.sales_refunds
    FOR EACH ROW EXECUTE FUNCTION public.fn_check_sales_closed_period();

DROP TRIGGER IF EXISTS trg_check_closed_sales_proc_payments ON public.sales_procurement_payments;
CREATE TRIGGER trg_check_closed_sales_proc_payments
    BEFORE INSERT OR UPDATE OR DELETE ON public.sales_procurement_payments
    FOR EACH ROW EXECUTE FUNCTION public.fn_check_sales_closed_period();

DROP TRIGGER IF EXISTS trg_check_closed_sales_expenses ON public.sales_expenses;
CREATE TRIGGER trg_check_closed_sales_expenses
    BEFORE INSERT OR UPDATE OR DELETE ON public.sales_expenses
    FOR EACH ROW EXECUTE FUNCTION public.fn_check_sales_closed_period();

DROP TRIGGER IF EXISTS trg_check_closed_sales_other_txns ON public.sales_other_transactions;
CREATE TRIGGER trg_check_closed_sales_other_txns
    BEFORE INSERT OR UPDATE OR DELETE ON public.sales_other_transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_check_sales_closed_period();

DROP TRIGGER IF EXISTS trg_check_closed_sales_transfers ON public.sales_fund_transfers;
CREATE TRIGGER trg_check_closed_sales_transfers
    BEFORE INSERT OR UPDATE OR DELETE ON public.sales_fund_transfers
    FOR EACH ROW EXECUTE FUNCTION public.fn_check_sales_closed_period();


-- ############################################################
-- ## 39_sales_targets.sql
-- ############################################################

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


-- ############################################################
-- ## 40_sales_account_ledger_view.sql
-- ############################################################

-- ============================================================
-- Migration 40: Unified Account Ledger View + Balance Helpers
-- Author: Manifest System
-- Phase: 1 (Money Management)
--
-- This is the Phase 1 shape of the ledger. It deliberately omits the vendor
-- consignment tables; the Vendor Consignment phase replaces this view with one
-- that adds VENDOR_SALE and VENDOR_SETTLEMENT rows.
--
-- security_invoker = true so the view respects the RLS policies of the
-- underlying tables rather than running with the view owner's rights.
--
-- Date handling: every row is stamped with the Africa/Kampala calendar date, so
-- a 01:30 EAT sale lands on the correct local day rather than the UTC day.
-- The `::timestamptz` cast before AT TIME ZONE is deliberate: it makes the
-- expression valid whether the underlying column is DATE or TIMESTAMPTZ.
-- ============================================================

DROP VIEW IF EXISTS public.sales_account_ledger;

CREATE VIEW public.sales_account_ledger
WITH (security_invoker = true) AS

-- 1. Customer payments received
SELECT
    p.manifest_id                                                      AS manifest_id,
    p.account_id                                                       AS account_id,
    (p.created_at::timestamptz AT TIME ZONE 'Africa/Kampala')::date    AS entry_date,
    'SALE_RECEIPT'                                                     AS entry_type,
    'IN'                                                               AS direction,
    p.amount::numeric(15, 2)                                           AS amount,
    'Sales receipt'                                                    AS description,
    p.reference                                                        AS reference,
    'sales_payments'                                                   AS source_table,
    p.id                                                               AS source_id,
    p.created_at                                                       AS created_at
FROM public.sales_payments p
WHERE p.account_id IS NOT NULL

UNION ALL

-- 2. Refunds paid back to customers
SELECT
    r.manifest_id,
    r.account_id,
    (r.refunded_at::timestamptz AT TIME ZONE 'Africa/Kampala')::date,
    'REFUND',
    'OUT',
    r.amount::numeric(15, 2),
    COALESCE('Refund: ' || r.reason, 'Refund'),
    NULL::text,
    'sales_refunds',
    r.id,
    r.refunded_at
FROM public.sales_refunds r
WHERE r.account_id IS NOT NULL

UNION ALL

-- 3. Payments made to suppliers
SELECT
    pp.manifest_id,
    pp.account_id,
    (pp.payment_date::timestamptz AT TIME ZONE 'Africa/Kampala')::date,
    'SUPPLIER_PAYMENT',
    'OUT',
    pp.amount::numeric(15, 2),
    'Payment to supplier',
    pp.transaction_reference,
    'sales_procurement_payments',
    pp.id,
    pp.payment_date::timestamptz
FROM public.sales_procurement_payments pp
WHERE pp.account_id IS NOT NULL

UNION ALL

-- 4. Approved expenses only. PENDING_APPROVAL, REJECTED and VOID never hit the ledger.
SELECT
    e.manifest_id,
    e.account_id,
    e.expense_date,
    'EXPENSE',
    'OUT',
    e.amount::numeric(15, 2),
    e.description,
    e.expense_number,
    'sales_expenses',
    e.id,
    e.created_at
FROM public.sales_expenses e
WHERE e.status = 'APPROVED'

UNION ALL

-- 5. Other money in / out that is not a sale, refund, expense or supplier payment
SELECT
    o.manifest_id,
    o.account_id,
    o.txn_date,
    CASE WHEN o.direction = 'IN' THEN 'OTHER_IN' ELSE 'OTHER_OUT' END,
    o.direction,
    o.amount::numeric(15, 2),
    o.description,
    o.reference,
    'sales_other_transactions',
    o.id,
    o.created_at
FROM public.sales_other_transactions o

UNION ALL

-- 6a. Transfer out: the sending account loses the amount AND the charges
SELECT
    t.manifest_id,
    t.from_account_id,
    t.transfer_date,
    'TRANSFER_OUT',
    'OUT',
    (t.amount + t.charges)::numeric(15, 2),
    CASE WHEN t.charges > 0
         THEN 'Transfer out (incl. charges ' || t.charges::text || ')'
         ELSE 'Transfer out' END,
    t.reference,
    'sales_fund_transfers',
    t.id,
    t.created_at
FROM public.sales_fund_transfers t

UNION ALL

-- 6b. Transfer in: the receiving account gains only the amount
SELECT
    t.manifest_id,
    t.to_account_id,
    t.transfer_date,
    'TRANSFER_IN',
    'IN',
    t.amount::numeric(15, 2),
    'Transfer in',
    t.reference,
    'sales_fund_transfers',
    t.id,
    t.created_at
FROM public.sales_fund_transfers t;


-- ============================================================
-- Balance helpers
--
-- Entries dated before the account's opening_balance_date are ignored: the
-- opening balance is a physical count on that date and already contains them.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sales_account_balance_asof(
    p_account_id UUID,
    p_as_of      DATE DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT a.opening_balance + COALESCE((
        SELECT SUM(CASE WHEN l.direction = 'IN' THEN l.amount ELSE -l.amount END)
        FROM public.sales_account_ledger l
        WHERE l.account_id  = a.id
          AND l.entry_date >= a.opening_balance_date
          AND (p_as_of IS NULL OR l.entry_date <= p_as_of)
    ), 0)
    FROM public.sales_money_accounts a
    WHERE a.id = p_account_id;
$$;

CREATE OR REPLACE FUNCTION public.sales_account_balance(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.sales_account_balance_asof(p_account_id, NULL);
$$;

REVOKE EXECUTE ON FUNCTION public.sales_account_balance_asof(UUID, DATE) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sales_account_balance(UUID)            FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.sales_account_balance_asof(UUID, DATE) TO service_role, authenticated;
GRANT  EXECUTE ON FUNCTION public.sales_account_balance(UUID)            TO service_role, authenticated;

GRANT SELECT ON public.sales_account_ledger TO authenticated, service_role;


-- ############################################################
-- ## 41_sales_transactional_rpcs.sql
-- ############################################################

-- ============================================================
-- Migration 41: Phase 1 Transactional RPCs
-- Author: Manifest System
-- Phase: 1 (Money Management)
--
-- Every function here is SECURITY DEFINER, takes p_manifest_id, and is locked
-- down to service_role so a browser client cannot bypass the backend rules.
--
-- Concurrency model:
--   * Money:  SELECT ... FOR UPDATE on sales_money_accounts before any overdraft
--             check, so two concurrent debits cannot both read the same balance.
--   * Stock:  guarded atomic UPDATE (WHERE stock_quantity - reserved_quantity >= qty).
--             Zero rows updated means someone else took the unit; the whole
--             transaction aborts.
--   * Deadlocks: variant rows are always locked in ascending id order.
--
-- NOTE ON DELIVERIES: the unified revenue model writes a delivery row on every
-- completed checkout, but sales_order_deliveries does not exist until the
-- Events & Preorders phase. sales_process_checkout is therefore replaced (not
-- added to) by that later migration. Until then, revenue is still recognised
-- from completed orders. See the audit notes accompanying this migration.
-- ============================================================


-- ------------------------------------------------------------
-- 0. Closed-period trigger function, hardened
--
-- NOT a bug fix. The migration-38 version computes the right date: a bare DATE
-- resolves to timestamptz before AT TIME ZONE, so a DATE payment_date is handled
-- correctly. This version changes three things and nothing else:
--   * SET search_path = public, so the function cannot be redirected by a
--     caller's search_path;
--   * one to_jsonb lookup instead of a duplicated OLD/NEW ELSIF chain, so the
--     vendor tables need no further edits to this function later;
--   * error text 'SALES_PERIOD_CLOSED: ...' instead of '409: ...', matching the
--     SALES_* codes the RPCs below raise, so the API layer maps one scheme.
-- If you would rather leave migration 38 alone, delete this block: nothing else
-- in this file depends on it.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_check_sales_closed_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_target_date DATE;
    v_manifest_id UUID;
    v_month       DATE;
    v_is_closed   BOOLEAN;
    v_rec         JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_rec := to_jsonb(OLD);
    ELSE
        v_rec := to_jsonb(NEW);
    END IF;

    v_manifest_id := (v_rec ->> 'manifest_id')::uuid;

    v_target_date := CASE TG_TABLE_NAME
        WHEN 'sales_payments'              THEN ((v_rec ->> 'created_at')::timestamptz  AT TIME ZONE 'Africa/Kampala')::date
        WHEN 'sales_refunds'               THEN ((v_rec ->> 'refunded_at')::timestamptz AT TIME ZONE 'Africa/Kampala')::date
        WHEN 'sales_procurement_payments'  THEN ((v_rec ->> 'payment_date')::timestamptz AT TIME ZONE 'Africa/Kampala')::date
        WHEN 'sales_expenses'              THEN (v_rec ->> 'expense_date')::date
        WHEN 'sales_other_transactions'    THEN (v_rec ->> 'txn_date')::date
        WHEN 'sales_fund_transfers'        THEN (v_rec ->> 'transfer_date')::date
        WHEN 'sales_vendor_sales'          THEN ((v_rec ->> 'sold_at')::timestamptz     AT TIME ZONE 'Africa/Kampala')::date
        WHEN 'sales_vendor_settlements'    THEN ((v_rec ->> 'settled_at')::timestamptz  AT TIME ZONE 'Africa/Kampala')::date
        ELSE CURRENT_DATE
    END;

    v_target_date := COALESCE(v_target_date, CURRENT_DATE);
    v_month := date_trunc('month', v_target_date)::date;

    SELECT EXISTS (
        SELECT 1 FROM public.sales_period_closes
        WHERE manifest_id = v_manifest_id AND month = v_month
    ) INTO v_is_closed;

    IF v_is_closed THEN
        RAISE EXCEPTION 'SALES_PERIOD_CLOSED: % is closed for manifest %', to_char(v_month, 'Mon YYYY'), v_manifest_id
            USING ERRCODE = 'P0001';
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;


-- ------------------------------------------------------------
-- 1. Overdraft guard
--
-- MUST be called only after the caller holds a FOR UPDATE lock on the account
-- row, otherwise two concurrent debits can both pass the check.
-- Cash and Mobile Money hard-abort. Bank is allowed to go negative by design
-- (decision 4): the API layer warns and asks for confirmation.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sales_assert_sufficient_funds(
    p_account_id UUID,
    p_amount     NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_type    TEXT;
    v_name    TEXT;
    v_balance NUMERIC;
BEGIN
    SELECT account_type, name INTO v_type, v_name
    FROM public.sales_money_accounts
    WHERE id = p_account_id;

    IF v_type IS NULL THEN
        RAISE EXCEPTION 'SALES_ACCOUNT_NOT_FOUND: %', p_account_id USING ERRCODE = 'P0002';
    END IF;

    IF v_type = 'BANK' THEN
        RETURN;
    END IF;

    v_balance := public.sales_account_balance(p_account_id);

    IF (v_balance - p_amount) < 0 THEN
        RAISE EXCEPTION 'SALES_INSUFFICIENT_FUNDS: % has %, needs %', v_name, v_balance, p_amount
            USING ERRCODE = 'P0003';
    END IF;
END;
$$;


-- ------------------------------------------------------------
-- 2. Fund transfer between two accounts
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sales_record_transfer(
    p_manifest_id     UUID,
    p_from_account_id UUID,
    p_to_account_id   UUID,
    p_amount          NUMERIC,
    p_charges         NUMERIC DEFAULT 0,
    p_transfer_date   DATE    DEFAULT NULL,
    p_reference       TEXT    DEFAULT NULL,
    p_notes           TEXT    DEFAULT NULL,
    p_created_by      TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id      UUID;
    v_date    DATE := COALESCE(p_transfer_date, (now() AT TIME ZONE 'Africa/Kampala')::date);
    v_charges NUMERIC := COALESCE(p_charges, 0);
    v_owned   INT;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'SALES_INVALID_AMOUNT: transfer amount must be greater than zero' USING ERRCODE = 'P0004';
    END IF;

    IF p_from_account_id = p_to_account_id THEN
        RAISE EXCEPTION 'SALES_INVALID_TRANSFER: source and destination must differ' USING ERRCODE = 'P0004';
    END IF;

    -- Both accounts must belong to this manifest. Lock in id order to avoid deadlock.
    SELECT count(*) INTO v_owned
    FROM (
        SELECT id FROM public.sales_money_accounts
        WHERE id IN (p_from_account_id, p_to_account_id)
          AND manifest_id = p_manifest_id
        ORDER BY id
        FOR UPDATE
    ) locked;

    IF v_owned <> 2 THEN
        RAISE EXCEPTION 'SALES_ACCOUNT_NOT_FOUND: both accounts must belong to manifest %', p_manifest_id
            USING ERRCODE = 'P0002';
    END IF;

    PERFORM public.sales_assert_sufficient_funds(p_from_account_id, p_amount + v_charges);

    INSERT INTO public.sales_fund_transfers (
        manifest_id, transfer_date, from_account_id, to_account_id,
        amount, charges, reference, notes, created_by
    )
    VALUES (
        p_manifest_id, v_date, p_from_account_id, p_to_account_id,
        p_amount, v_charges, p_reference, p_notes, p_created_by
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;


-- ------------------------------------------------------------
-- 3. Expense approval
--
-- The requester can never approve their own expense, whatever their role.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sales_approve_expense(
    p_manifest_id   UUID,
    p_expense_id    UUID,
    p_approver      TEXT,
    p_approver_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exp      RECORD;
    v_approver TEXT := NULLIF(btrim(p_approver), '');
BEGIN
    IF v_approver IS NULL THEN
        RAISE EXCEPTION 'SALES_APPROVER_REQUIRED: an approver identity is required' USING ERRCODE = 'P0005';
    END IF;

    IF p_approver_role IS NULL
       OR p_approver_role NOT IN ('Administrator', 'Super Admin', 'Department', 'Finance') THEN
        RAISE EXCEPTION 'SALES_FORBIDDEN: role % may not approve expenses', COALESCE(p_approver_role, '(none)')
            USING ERRCODE = 'P0005';
    END IF;

    SELECT * INTO v_exp
    FROM public.sales_expenses
    WHERE id = p_expense_id AND manifest_id = p_manifest_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_EXPENSE_NOT_FOUND: %', p_expense_id USING ERRCODE = 'P0002';
    END IF;

    IF v_exp.status <> 'PENDING_APPROVAL' THEN
        RAISE EXCEPTION 'SALES_INVALID_STATE: expense % is already %', v_exp.expense_number, v_exp.status
            USING ERRCODE = 'P0004';
    END IF;

    IF lower(btrim(COALESCE(v_exp.requested_by, ''))) = lower(v_approver) THEN
        RAISE EXCEPTION 'SALES_SELF_APPROVAL: the requester may not approve their own expense'
            USING ERRCODE = 'P0005';
    END IF;

    -- Lock the paying account, then check it can carry the expense.
    PERFORM 1 FROM public.sales_money_accounts WHERE id = v_exp.account_id FOR UPDATE;
    PERFORM public.sales_assert_sufficient_funds(v_exp.account_id, v_exp.amount);

    UPDATE public.sales_expenses
    SET status      = 'APPROVED',
        approved_by = v_approver,
        approved_at = now(),
        updated_at  = now()
    WHERE id = p_expense_id;

    RETURN jsonb_build_object(
        'id', p_expense_id,
        'expense_number', v_exp.expense_number,
        'status', 'APPROVED',
        'account_balance', public.sales_account_balance(v_exp.account_id)
    );
END;
$$;


-- ------------------------------------------------------------
-- 4. POS checkout
--
-- p_items: [{"variant_id": uuid, "quantity": int}]
-- Prices are taken from the variant row on the server. A client-supplied price
-- is never trusted.
-- p_order_payload carries optional extra order columns (customer_id, etc.);
-- unknown keys are ignored.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sales_process_checkout(
    p_manifest_id    UUID,
    p_items          JSONB,
    p_amount_paid    NUMERIC,
    p_account_id     UUID,
    p_payment_method TEXT,
    p_reference      TEXT  DEFAULT NULL,
    p_created_by     TEXT  DEFAULT NULL,
    p_order_payload  JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id     UUID := gen_random_uuid();
    v_total        NUMERIC(15, 2) := 0;
    v_paid         NUMERIC(15, 2) := COALESCE(p_amount_paid, 0);
    v_pay_status   TEXT;
    v_fulfil       TEXT;
    v_item         JSONB;
    v_variant      RECORD;
    v_qty          INT;
    v_rows         INT;
    v_order_json   JSONB;
    v_account_ok   BOOLEAN;
BEGIN
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'SALES_NO_ITEMS: a checkout needs at least one item' USING ERRCODE = 'P0004';
    END IF;

    IF v_paid > 0 THEN
        SELECT true INTO v_account_ok
        FROM public.sales_money_accounts
        WHERE id = p_account_id AND manifest_id = p_manifest_id;

        IF NOT COALESCE(v_account_ok, false) THEN
            RAISE EXCEPTION 'SALES_ACCOUNT_NOT_FOUND: account % is not in manifest %', p_account_id, p_manifest_id
                USING ERRCODE = 'P0002';
        END IF;
    END IF;

    -- Lock every variant up front, in id order, so concurrent checkouts serialise
    -- rather than deadlock.
    PERFORM 1
    FROM public.sales_product_variants
    WHERE id IN (
        SELECT (i ->> 'variant_id')::uuid FROM jsonb_array_elements(p_items) i
    )
    ORDER BY id
    FOR UPDATE;

    -- Price the order from the server-side variant rows.
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := (v_item ->> 'quantity')::int;
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'SALES_INVALID_QUANTITY: quantity must be greater than zero' USING ERRCODE = 'P0004';
        END IF;

        SELECT id, selling_price, cost_price, stock_quantity, COALESCE(reserved_quantity, 0) AS reserved_quantity
        INTO v_variant
        FROM public.sales_product_variants
        WHERE id = (v_item ->> 'variant_id')::uuid AND manifest_id = p_manifest_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'SALES_VARIANT_NOT_FOUND: %', (v_item ->> 'variant_id') USING ERRCODE = 'P0002';
        END IF;

        IF (v_variant.stock_quantity - v_variant.reserved_quantity) < v_qty THEN
            RAISE EXCEPTION 'SALES_INSUFFICIENT_STOCK: only % available', (v_variant.stock_quantity - v_variant.reserved_quantity)
                USING ERRCODE = 'P0006';
        END IF;

        v_total := v_total + (v_variant.selling_price * v_qty);
    END LOOP;

    v_pay_status := CASE
        WHEN v_paid >= v_total THEN 'PAID'
        WHEN v_paid > 0        THEN 'PARTIAL'
        ELSE 'UNPAID'
    END;
    v_fulfil := CASE
        WHEN v_paid >= v_total THEN 'COMPLETED'
        WHEN v_paid > 0        THEN 'RESERVED'
        ELSE 'PENDING'
    END;

    -- Build the order row. Keys that do not exist as columns are ignored.
    v_order_json := COALESCE(p_order_payload, '{}'::jsonb) || jsonb_build_object(
        'id',                 v_order_id,
        'manifest_id',        p_manifest_id,
        'total_amount',       v_total,
        'amount_paid',        v_paid,
        'payment_status',     v_pay_status,
        'fulfillment_status', v_fulfil,
        'created_at',         now(),
        'updated_at',         now()
    );

    INSERT INTO public.sales_orders
    SELECT * FROM jsonb_populate_record(NULL::public.sales_orders, v_order_json);

    -- Items, stock and movements
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := (v_item ->> 'quantity')::int;

        SELECT id, selling_price, cost_price INTO v_variant
        FROM public.sales_product_variants
        WHERE id = (v_item ->> 'variant_id')::uuid;

        INSERT INTO public.sales_order_items (order_id, variant_id, quantity, unit_price, unit_cost_price)
        VALUES (v_order_id, v_variant.id, v_qty, v_variant.selling_price, v_variant.cost_price);

        IF v_fulfil = 'COMPLETED' THEN
            UPDATE public.sales_product_variants
            SET stock_quantity = stock_quantity - v_qty
            WHERE id = v_variant.id
              AND (stock_quantity - COALESCE(reserved_quantity, 0)) >= v_qty;

            GET DIAGNOSTICS v_rows = ROW_COUNT;
            IF v_rows = 0 THEN
                RAISE EXCEPTION 'SALES_INSUFFICIENT_STOCK: stock changed during checkout' USING ERRCODE = 'P0006';
            END IF;

            INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id)
            VALUES (p_manifest_id, v_variant.id, 'SALE', v_qty, 'POS completed', v_order_id);

        ELSIF v_fulfil = 'RESERVED' THEN
            UPDATE public.sales_product_variants
            SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_qty
            WHERE id = v_variant.id
              AND (stock_quantity - COALESCE(reserved_quantity, 0)) >= v_qty;

            GET DIAGNOSTICS v_rows = ROW_COUNT;
            IF v_rows = 0 THEN
                RAISE EXCEPTION 'SALES_INSUFFICIENT_STOCK: stock changed during checkout' USING ERRCODE = 'P0006';
            END IF;

            INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id)
            VALUES (p_manifest_id, v_variant.id, 'RESERVATION', v_qty, 'POS partially paid', v_order_id);
        END IF;
    END LOOP;

    -- Payment
    IF v_paid > 0 THEN
        INSERT INTO public.sales_payments (manifest_id, order_id, amount, payment_method, reference, account_id)
        VALUES (p_manifest_id, v_order_id, v_paid, p_payment_method, COALESCE(p_reference, 'POS Checkout'), p_account_id);
    END IF;

    RETURN jsonb_build_object(
        'order_id',          v_order_id,
        'total_amount',      v_total,
        'amount_paid',       v_paid,
        'payment_status',    v_pay_status,
        'fulfillment_status', v_fulfil
    );
END;
$$;


-- ------------------------------------------------------------
-- 5. Record a payment against an existing order
--
-- amount_paid is recomputed from the payment and refund rows rather than
-- incremented, so a retried request can never inflate the order.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sales_record_payment(
    p_manifest_id    UUID,
    p_order_id       UUID,
    p_amount         NUMERIC,
    p_account_id     UUID,
    p_payment_method TEXT,
    p_reference      TEXT DEFAULT NULL,
    p_created_by     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order      RECORD;
    v_paid       NUMERIC(15, 2);
    v_pay_status TEXT;
    v_reserve    BOOLEAN := false;
    v_item       RECORD;
    v_rows       INT;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'SALES_INVALID_AMOUNT: payment must be greater than zero' USING ERRCODE = 'P0004';
    END IF;

    PERFORM 1 FROM public.sales_money_accounts
    WHERE id = p_account_id AND manifest_id = p_manifest_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_ACCOUNT_NOT_FOUND: %', p_account_id USING ERRCODE = 'P0002';
    END IF;

    SELECT * INTO v_order
    FROM public.sales_orders
    WHERE id = p_order_id AND manifest_id = p_manifest_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_ORDER_NOT_FOUND: %', p_order_id USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.sales_payments (manifest_id, order_id, amount, payment_method, reference, account_id)
    VALUES (p_manifest_id, p_order_id, p_amount, p_payment_method, p_reference, p_account_id);

    SELECT GREATEST(0,
        COALESCE((SELECT SUM(amount) FROM public.sales_payments WHERE order_id = p_order_id), 0)
      - COALESCE((SELECT SUM(amount) FROM public.sales_refunds  WHERE order_id = p_order_id), 0)
    ) INTO v_paid;

    v_pay_status := CASE
        WHEN v_paid >= v_order.total_amount THEN 'PAID'
        WHEN v_paid > 0                     THEN 'PARTIAL'
        ELSE 'UNPAID'
    END;

    v_reserve := (v_order.fulfillment_status = 'PENDING' AND v_paid > 0);

    UPDATE public.sales_orders
    SET amount_paid        = v_paid,
        payment_status     = v_pay_status,
        fulfillment_status = CASE WHEN v_reserve THEN 'RESERVED' ELSE fulfillment_status END,
        updated_at         = now()
    WHERE id = p_order_id;

    -- First money on a pending order reserves the stock.
    IF v_reserve THEN
        FOR v_item IN
            SELECT variant_id, quantity FROM public.sales_order_items
            WHERE order_id = p_order_id ORDER BY variant_id
        LOOP
            UPDATE public.sales_product_variants
            SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_item.quantity
            WHERE id = v_item.variant_id
              AND (stock_quantity - COALESCE(reserved_quantity, 0)) >= v_item.quantity;

            GET DIAGNOSTICS v_rows = ROW_COUNT;
            IF v_rows = 0 THEN
                RAISE EXCEPTION 'SALES_INSUFFICIENT_STOCK: cannot reserve % units', v_item.quantity
                    USING ERRCODE = 'P0006';
            END IF;

            INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id)
            VALUES (p_manifest_id, v_item.variant_id, 'RESERVATION', v_item.quantity, 'Order paid or part-paid', p_order_id);
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'order_id', p_order_id,
        'amount_paid', v_paid,
        'payment_status', v_pay_status
    );
END;
$$;


-- ------------------------------------------------------------
-- 6. Refund
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sales_process_refund(
    p_manifest_id    UUID,
    p_order_id       UUID,
    p_amount         NUMERIC,
    p_account_id     UUID,
    p_payment_method TEXT,
    p_reason         TEXT DEFAULT NULL,
    p_created_by     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order    RECORD;
    v_paid     NUMERIC(15, 2);
    v_status   TEXT;
    v_fulfil   TEXT;
    v_item     RECORD;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'SALES_INVALID_AMOUNT: refund must be greater than zero' USING ERRCODE = 'P0004';
    END IF;

    SELECT * INTO v_order
    FROM public.sales_orders
    WHERE id = p_order_id AND manifest_id = p_manifest_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_ORDER_NOT_FOUND: %', p_order_id USING ERRCODE = 'P0002';
    END IF;

    IF p_amount > v_order.amount_paid THEN
        RAISE EXCEPTION 'SALES_REFUND_EXCEEDS_PAID: order has % paid', v_order.amount_paid USING ERRCODE = 'P0004';
    END IF;

    PERFORM 1 FROM public.sales_money_accounts
    WHERE id = p_account_id AND manifest_id = p_manifest_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_ACCOUNT_NOT_FOUND: %', p_account_id USING ERRCODE = 'P0002';
    END IF;

    PERFORM public.sales_assert_sufficient_funds(p_account_id, p_amount);

    INSERT INTO public.sales_refunds (manifest_id, order_id, amount, account_id, payment_method, reason, created_by)
    VALUES (p_manifest_id, p_order_id, p_amount, p_account_id, p_payment_method, p_reason, p_created_by);

    SELECT GREATEST(0,
        COALESCE((SELECT SUM(amount) FROM public.sales_payments WHERE order_id = p_order_id), 0)
      - COALESCE((SELECT SUM(amount) FROM public.sales_refunds  WHERE order_id = p_order_id), 0)
    ) INTO v_paid;

    v_fulfil := v_order.fulfillment_status;

    -- Releasing a reservation is only correct while the goods are still with us.
    IF v_order.fulfillment_status IN ('RESERVED', 'PENDING') THEN
        FOR v_item IN
            SELECT variant_id, quantity FROM public.sales_order_items
            WHERE order_id = p_order_id ORDER BY variant_id
        LOOP
            UPDATE public.sales_product_variants
            SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
            WHERE id = v_item.variant_id;

            INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id)
            VALUES (p_manifest_id, v_item.variant_id, 'RESERVATION_RELEASE', v_item.quantity, 'Order refunded', p_order_id);
        END LOOP;
        v_fulfil := 'CANCELLED';
    END IF;

    v_status := CASE
        WHEN v_paid <= 0                     THEN 'REFUNDED'
        WHEN v_paid >= v_order.total_amount  THEN 'PAID'
        ELSE 'PARTIAL'
    END;

    UPDATE public.sales_orders
    SET amount_paid        = v_paid,
        payment_status     = v_status,
        fulfillment_status = v_fulfil,
        updated_at         = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'order_id', p_order_id,
        'amount_paid', v_paid,
        'payment_status', v_status,
        'fulfillment_status', v_fulfil
    );
END;
$$;


-- ------------------------------------------------------------
-- 7. Fulfil (release goods for) a fully paid order
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sales_fulfill_order(
    p_manifest_id UUID,
    p_order_id    UUID,
    p_created_by  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order       RECORD;
    v_item        RECORD;
    v_was_reserved BOOLEAN;
    v_rows        INT;
BEGIN
    SELECT * INTO v_order
    FROM public.sales_orders
    WHERE id = p_order_id AND manifest_id = p_manifest_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_ORDER_NOT_FOUND: %', p_order_id USING ERRCODE = 'P0002';
    END IF;

    IF v_order.payment_status <> 'PAID' THEN
        RAISE EXCEPTION 'SALES_NOT_FULLY_PAID: no item release before full payment' USING ERRCODE = 'P0004';
    END IF;

    IF v_order.fulfillment_status = 'COMPLETED' THEN
        RAISE EXCEPTION 'SALES_INVALID_STATE: order is already completed' USING ERRCODE = 'P0004';
    END IF;

    v_was_reserved := (v_order.fulfillment_status = 'RESERVED');

    PERFORM 1
    FROM public.sales_product_variants
    WHERE id IN (SELECT variant_id FROM public.sales_order_items WHERE order_id = p_order_id)
    ORDER BY id
    FOR UPDATE;

    FOR v_item IN
        SELECT variant_id, quantity FROM public.sales_order_items
        WHERE order_id = p_order_id ORDER BY variant_id
    LOOP
        IF v_was_reserved THEN
            -- The units are already reserved for this order, so availability is
            -- measured against stock alone.
            UPDATE public.sales_product_variants
            SET stock_quantity    = stock_quantity - v_item.quantity,
                reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
            WHERE id = v_item.variant_id
              AND stock_quantity >= v_item.quantity;
        ELSE
            UPDATE public.sales_product_variants
            SET stock_quantity = stock_quantity - v_item.quantity
            WHERE id = v_item.variant_id
              AND (stock_quantity - COALESCE(reserved_quantity, 0)) >= v_item.quantity;
        END IF;

        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
            RAISE EXCEPTION 'SALES_INSUFFICIENT_STOCK: cannot release % units', v_item.quantity USING ERRCODE = 'P0006';
        END IF;

        IF v_was_reserved THEN
            INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id)
            VALUES (p_manifest_id, v_item.variant_id, 'RESERVATION_RELEASE', v_item.quantity, 'Order fulfilled', p_order_id);
        END IF;

        INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id)
        VALUES (p_manifest_id, v_item.variant_id, 'SALE', v_item.quantity, 'Order completed', p_order_id);
    END LOOP;

    UPDATE public.sales_orders
    SET fulfillment_status = 'COMPLETED', updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('order_id', p_order_id, 'fulfillment_status', 'COMPLETED');
END;
$$;


-- ------------------------------------------------------------
-- 8. Complete a stock take
--
-- p_items: [{"variant_id": uuid, "system_quantity": int, "physical_quantity": int,
--            "variance": int, "reason": text}]
-- A non-zero variance without a reason is rejected.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sales_complete_stock_take(
    p_manifest_id UUID,
    p_session_id  UUID,
    p_items       JSONB,
    p_created_by  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session   RECORD;
    v_item      JSONB;
    v_variant   UUID;
    v_physical  INT;
    v_variance  INT;
    v_reason    TEXT;
    v_adjusted  INT := 0;
BEGIN
    SELECT * INTO v_session
    FROM public.sales_stock_taking_sessions
    WHERE id = p_session_id AND manifest_id = p_manifest_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_SESSION_NOT_FOUND: %', p_session_id USING ERRCODE = 'P0002';
    END IF;

    IF v_session.status = 'COMPLETED' THEN
        RAISE EXCEPTION 'SALES_INVALID_STATE: stock take is already completed' USING ERRCODE = 'P0004';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
        v_variant  := (v_item ->> 'variant_id')::uuid;
        v_physical := (v_item ->> 'physical_quantity')::int;
        v_variance := COALESCE((v_item ->> 'variance')::int, 0);
        v_reason   := NULLIF(btrim(COALESCE(v_item ->> 'reason', '')), '');

        IF v_physical IS NULL OR v_physical < 0 THEN
            RAISE EXCEPTION 'SALES_INVALID_QUANTITY: physical count must be zero or more' USING ERRCODE = 'P0004';
        END IF;

        IF v_variance <> 0 AND v_reason IS NULL THEN
            RAISE EXCEPTION 'SALES_REASON_REQUIRED: a reason is required for variance % on variant %', v_variance, v_variant
                USING ERRCODE = 'P0004';
        END IF;

        INSERT INTO public.sales_stock_taking_items (session_id, variant_id, system_quantity, physical_quantity, variance, reason)
        VALUES (p_session_id, v_variant, (v_item ->> 'system_quantity')::int, v_physical, v_variance, v_reason);

        IF v_variance <> 0 THEN
            UPDATE public.sales_product_variants
            SET stock_quantity = v_physical
            WHERE id = v_variant AND manifest_id = p_manifest_id;

            INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id)
            VALUES (p_manifest_id, v_variant, 'ADJUSTMENT', v_variance, COALESCE(v_reason, 'Stock Take'), p_session_id);

            v_adjusted := v_adjusted + 1;
        END IF;
    END LOOP;

    UPDATE public.sales_stock_taking_sessions
    SET status = 'COMPLETED', completed_at = now()
    WHERE id = p_session_id;

    RETURN jsonb_build_object('session_id', p_session_id, 'adjusted_variants', v_adjusted);
END;
$$;


-- ------------------------------------------------------------
-- 9. Security lockdown
--
-- These functions carry the business rules. Only the backend service role may
-- call them; a browser client holding an anon or authenticated JWT cannot.
-- ------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.sales_assert_sufficient_funds(UUID, NUMERIC)                                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sales_record_transfer(UUID, UUID, UUID, NUMERIC, NUMERIC, DATE, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sales_approve_expense(UUID, UUID, TEXT, TEXT)                                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sales_process_checkout(UUID, JSONB, NUMERIC, UUID, TEXT, TEXT, TEXT, JSONB)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sales_record_payment(UUID, UUID, NUMERIC, UUID, TEXT, TEXT, TEXT)               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sales_process_refund(UUID, UUID, NUMERIC, UUID, TEXT, TEXT, TEXT)               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sales_fulfill_order(UUID, UUID, TEXT)                                           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sales_complete_stock_take(UUID, UUID, JSONB, TEXT)                              FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sales_assert_sufficient_funds(UUID, NUMERIC)                                    TO service_role;
GRANT EXECUTE ON FUNCTION public.sales_record_transfer(UUID, UUID, UUID, NUMERIC, NUMERIC, DATE, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.sales_approve_expense(UUID, UUID, TEXT, TEXT)                                   TO service_role;
GRANT EXECUTE ON FUNCTION public.sales_process_checkout(UUID, JSONB, NUMERIC, UUID, TEXT, TEXT, TEXT, JSONB)     TO service_role;
GRANT EXECUTE ON FUNCTION public.sales_record_payment(UUID, UUID, NUMERIC, UUID, TEXT, TEXT, TEXT)               TO service_role;
GRANT EXECUTE ON FUNCTION public.sales_process_refund(UUID, UUID, NUMERIC, UUID, TEXT, TEXT, TEXT)               TO service_role;
GRANT EXECUTE ON FUNCTION public.sales_fulfill_order(UUID, UUID, TEXT)                                           TO service_role;
GRANT EXECUTE ON FUNCTION public.sales_complete_stock_take(UUID, UUID, JSONB, TEXT)                              TO service_role;

