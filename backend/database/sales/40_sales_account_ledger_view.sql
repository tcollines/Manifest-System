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
