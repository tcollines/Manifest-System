-- ============================================================
-- Migration 47: Edit and delete for supplier payments
-- Author: Manifest System
-- Phase: none. Like 44, 45 and 46 this is an after-the-fact addition, not a
--        plan phase. Plan Phase 3 has still not been written; it starts at 48.
--
-- This migration does NOT rewrite existing data. It replaces one trigger
-- function and adds two RPCs.
--
-- WHY RPCS AND NOT SERVICE CODE
--
-- Both operations change what a money account holds, so CLAUDE.md puts them in
-- Postgres: atomic, SELECT ... FOR UPDATE on the rows they touch, locked in a
-- deterministic order. Editing is the harder of the two — it can move money
-- between two accounts at once, which is why both are locked, in ascending id
-- order, the same order sales_record_supplier_payment uses.
--
-- WHAT IT CHANGES
--
-- 1. fn_check_sales_closed_period() now checks BOTH rows on an UPDATE.
--
--    It only ever looked at NEW. That was harmless while nothing updated these
--    tables, but an edit endpoint makes it a hole: a payment sitting in a
--    closed month could be given a date in an open one and the guard would
--    pass, quietly restating a period that has already been reported. Reading
--    OLD as well refuses to move a row out of a closed month, and refuses to
--    move one into a closed month, which is what a period close means.
--
--    This applies to all seven guarded tables, not only supplier payments.
--    The date-extraction branches are reproduced byte for byte from 45.
--
-- 2. sales_update_supplier_payment() — amount, account, method, date,
--    reference, notes.
--
-- 3. sales_delete_supplier_payment() — removes the row outright.
--
-- NO BALANCE REPAIR IS NEEDED BY EITHER
--
-- sales_account_ledger is a plain VIEW and sales_account_balance sums it live,
-- so a payment row IS the balance entry. Changing the row changes the balance;
-- deleting it removes the entry. There is no stored total to keep in step.
--
-- SUFFICIENCY ON AN EDIT
--
-- Checked before the write, against what actually changes:
--   * same account   -> only the increase is tested, because the old amount is
--                       already debited.
--   * different account -> the full new amount is tested against the new
--                       account. The old one is only credited back, so it
--                       cannot be driven negative.
-- A delete needs no check at all; a balance can only rise.
--
-- DELIBERATELY NOT EDITABLE
--
-- supplier_id and procurement_request_id. Re-pointing a payment at a different
-- supplier or purchase order would have to recompute two orders and re-verify
-- the supplier, and it is a different operation from correcting an amount or a
-- typo. Delete the payment and record it again against the right document.
--
-- p_payment_date NULL means "leave the date alone". Every other parameter is a
-- straight replacement, so passing NULL for p_reference or p_notes clears it.
-- ============================================================

-- ─── 1. Period guard: check both sides of an UPDATE ──────────────────────────

CREATE OR REPLACE FUNCTION public.fn_check_sales_closed_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_recs        JSONB[];
    v_rec         JSONB;
    v_target_date DATE;
    v_manifest_id UUID;
    v_month       DATE;
    v_is_closed   BOOLEAN;
BEGIN
    -- An UPDATE is checked against OLD and NEW. Checking only NEW would allow
    -- a row to be edited out of a closed month.
    IF (TG_OP = 'DELETE') THEN
        v_recs := ARRAY[to_jsonb(OLD)];
    ELSIF (TG_OP = 'UPDATE') THEN
        v_recs := ARRAY[to_jsonb(OLD), to_jsonb(NEW)];
    ELSE
        v_recs := ARRAY[to_jsonb(NEW)];
    END IF;

    FOREACH v_rec IN ARRAY v_recs LOOP
        v_manifest_id := (v_rec ->> 'manifest_id')::uuid;

        v_target_date := CASE TG_TABLE_NAME
            WHEN 'sales_payments'              THEN ((v_rec ->> 'created_at')::timestamptz  AT TIME ZONE 'Africa/Kampala')::date
            WHEN 'sales_refunds'               THEN ((v_rec ->> 'refunded_at')::timestamptz AT TIME ZONE 'Africa/Kampala')::date
            WHEN 'sales_procurement_payments'  THEN ((v_rec ->> 'payment_date')::timestamptz AT TIME ZONE 'Africa/Kampala')::date
            WHEN 'sales_expenses'              THEN (v_rec ->> 'expense_date')::date
            WHEN 'sales_other_transactions'    THEN (v_rec ->> 'txn_date')::date
            WHEN 'sales_fund_transfers'        THEN (v_rec ->> 'transfer_date')::date
            WHEN 'sales_goods_receipts'        THEN (v_rec ->> 'received_date')::date
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
    END LOOP;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- ─── 2. Edit a supplier payment ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sales_update_supplier_payment(
    p_manifest_id    UUID,
    p_payment_id     UUID,
    p_amount         NUMERIC,
    p_account_id     UUID,
    p_payment_method TEXT,
    p_payment_date   DATE DEFAULT NULL,
    p_reference      TEXT DEFAULT NULL,
    p_notes          TEXT DEFAULT NULL,
    p_updated_by     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old        public.sales_procurement_payments%ROWTYPE;
    v_date       DATE;
    v_delta      NUMERIC;
    v_total      NUMERIC;
    v_paid       NUMERIC;
    v_balance    NUMERIC;
    v_status     TEXT;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'SALES_INVALID_AMOUNT: payment must be greater than zero'
            USING ERRCODE = 'P0004';
    END IF;

    IF p_payment_method IS NULL OR p_payment_method NOT IN
        ('Cash', 'MTN Mobile Money', 'Airtel Money', 'Bank', 'Card', 'Other') THEN
        RAISE EXCEPTION 'SALES_INVALID_PAYMENT_METHOD: %', COALESCE(p_payment_method, '(null)')
            USING ERRCODE = 'P0004';
    END IF;

    -- The payment itself, locked. Scoped by manifest, so a payment id from
    -- another tenant simply does not exist here.
    SELECT * INTO v_old
    FROM public.sales_procurement_payments
    WHERE id = p_payment_id AND manifest_id = p_manifest_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_PAYMENT_NOT_FOUND: %', p_payment_id USING ERRCODE = 'P0002';
    END IF;

    v_date := COALESCE(p_payment_date, (v_old.payment_date AT TIME ZONE 'Africa/Kampala')::date);

    -- Lock order, matching sales_record_supplier_payment: the purchase order
    -- first, then the money accounts in ascending id order. Two RPCs taking
    -- these rows in the same order cannot deadlock against each other.
    IF v_old.procurement_request_id IS NOT NULL THEN
        PERFORM 1 FROM public.sales_procurement_requests
        WHERE id = v_old.procurement_request_id AND manifest_id = p_manifest_id
        FOR UPDATE;
    END IF;

    PERFORM id FROM public.sales_money_accounts
    WHERE id IN (v_old.account_id, p_account_id)
      AND manifest_id = p_manifest_id
    ORDER BY id
    FOR UPDATE;

    PERFORM 1 FROM public.sales_money_accounts
    WHERE id = p_account_id AND manifest_id = p_manifest_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_ACCOUNT_NOT_FOUND: %', p_account_id USING ERRCODE = 'P0002';
    END IF;

    -- Only the additional exposure is tested. IS NOT DISTINCT FROM so that a
    -- legacy row with a NULL account takes the "different account" branch.
    IF p_account_id IS NOT DISTINCT FROM v_old.account_id THEN
        v_delta := p_amount - v_old.amount;
        IF v_delta > 0 THEN
            PERFORM public.sales_assert_sufficient_funds(p_account_id, v_delta);
        END IF;
    ELSE
        PERFORM public.sales_assert_sufficient_funds(p_account_id, p_amount);
    END IF;

    -- The closed-period trigger fires here against both the old and the new
    -- date, and raises SALES_PERIOD_CLOSED (P0001) if either is in a closed
    -- month.
    UPDATE public.sales_procurement_payments
    SET amount                = p_amount,
        account_id            = p_account_id,
        payment_method        = p_payment_method,
        payment_date          = v_date,
        transaction_reference = p_reference,
        notes                 = p_notes
    WHERE id = p_payment_id AND manifest_id = p_manifest_id;

    IF v_old.procurement_request_id IS NOT NULL THEN
        SELECT COALESCE(round(SUM(i.expected_cost * i.quantity_ordered)), 0)
        INTO v_total
        FROM public.sales_procurement_request_items i
        WHERE i.request_id = v_old.procurement_request_id;

        SELECT COALESCE(round(SUM(pp.amount)), 0)
        INTO v_paid
        FROM public.sales_procurement_payments pp
        WHERE pp.procurement_request_id = v_old.procurement_request_id
          AND pp.manifest_id = p_manifest_id;

        v_balance := GREATEST(0, v_total - v_paid);
        v_status := CASE
            WHEN v_balance = 0 AND v_total > 0 THEN 'PAID'
            WHEN v_total = 0 AND v_paid = 0    THEN 'PAID'
            WHEN v_paid > 0 AND v_balance > 0  THEN 'PARTIAL'
            ELSE 'UNPAID'
        END;

        UPDATE public.sales_procurement_requests
        SET total_amount   = v_total,
            amount_paid    = v_paid,
            balance_due    = v_balance,
            payment_status = v_status
        WHERE id = v_old.procurement_request_id
          AND manifest_id = p_manifest_id;
    END IF;

    RETURN jsonb_build_object(
        'payment_id',             p_payment_id,
        'supplier_id',            v_old.supplier_id,
        'amount',                 p_amount,
        'previous_amount',        v_old.amount,
        'payment_date',           v_date,
        'account_id',             p_account_id,
        'previous_account_id',    v_old.account_id,
        'account_balance',        public.sales_account_balance(p_account_id),
        'previous_account_balance',
            CASE WHEN v_old.account_id IS NOT NULL AND v_old.account_id <> p_account_id
                 THEN public.sales_account_balance(v_old.account_id) END,
        'procurement_request_id', v_old.procurement_request_id,
        'request_balance_due',    v_balance,
        'updated_by',             p_updated_by
    );
END;
$$;

-- ─── 3. Delete a supplier payment ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sales_delete_supplier_payment(
    p_manifest_id UUID,
    p_payment_id  UUID,
    p_deleted_by  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old     public.sales_procurement_payments%ROWTYPE;
    v_total   NUMERIC;
    v_paid    NUMERIC;
    v_balance NUMERIC;
    v_status  TEXT;
BEGIN
    SELECT * INTO v_old
    FROM public.sales_procurement_payments
    WHERE id = p_payment_id AND manifest_id = p_manifest_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_PAYMENT_NOT_FOUND: %', p_payment_id USING ERRCODE = 'P0002';
    END IF;

    -- Same lock order as the other two RPCs: order, then account.
    IF v_old.procurement_request_id IS NOT NULL THEN
        PERFORM 1 FROM public.sales_procurement_requests
        WHERE id = v_old.procurement_request_id AND manifest_id = p_manifest_id
        FOR UPDATE;
    END IF;

    IF v_old.account_id IS NOT NULL THEN
        PERFORM 1 FROM public.sales_money_accounts
        WHERE id = v_old.account_id AND manifest_id = p_manifest_id
        FOR UPDATE;
    END IF;

    -- No sufficiency check: removing a payment can only raise a balance. The
    -- closed-period trigger fires against OLD and refuses a row whose date
    -- falls in a closed month.
    DELETE FROM public.sales_procurement_payments
    WHERE id = p_payment_id AND manifest_id = p_manifest_id;

    IF v_old.procurement_request_id IS NOT NULL THEN
        SELECT COALESCE(round(SUM(i.expected_cost * i.quantity_ordered)), 0)
        INTO v_total
        FROM public.sales_procurement_request_items i
        WHERE i.request_id = v_old.procurement_request_id;

        SELECT COALESCE(round(SUM(pp.amount)), 0)
        INTO v_paid
        FROM public.sales_procurement_payments pp
        WHERE pp.procurement_request_id = v_old.procurement_request_id
          AND pp.manifest_id = p_manifest_id;

        v_balance := GREATEST(0, v_total - v_paid);
        v_status := CASE
            WHEN v_balance = 0 AND v_total > 0 THEN 'PAID'
            WHEN v_total = 0 AND v_paid = 0    THEN 'PAID'
            WHEN v_paid > 0 AND v_balance > 0  THEN 'PARTIAL'
            ELSE 'UNPAID'
        END;

        UPDATE public.sales_procurement_requests
        SET total_amount   = v_total,
            amount_paid    = v_paid,
            balance_due    = v_balance,
            payment_status = v_status
        WHERE id = v_old.procurement_request_id
          AND manifest_id = p_manifest_id;
    END IF;

    RETURN jsonb_build_object(
        'payment_id',             p_payment_id,
        'supplier_id',            v_old.supplier_id,
        'amount',                 v_old.amount,
        'payment_date',           v_old.payment_date,
        'account_id',             v_old.account_id,
        'account_balance',
            CASE WHEN v_old.account_id IS NOT NULL
                 THEN public.sales_account_balance(v_old.account_id) END,
        'procurement_request_id', v_old.procurement_request_id,
        'request_balance_due',    v_balance,
        'deleted_by',             p_deleted_by
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sales_update_supplier_payment(UUID, UUID, NUMERIC, UUID, TEXT, DATE, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sales_delete_supplier_payment(UUID, UUID, TEXT)                                       FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.sales_update_supplier_payment(UUID, UUID, NUMERIC, UUID, TEXT, DATE, TEXT, TEXT, TEXT) TO service_role;
GRANT  EXECUTE ON FUNCTION public.sales_delete_supplier_payment(UUID, UUID, TEXT)                                       TO service_role;
