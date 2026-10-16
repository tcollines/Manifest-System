-- ============================================================
-- Sales migration 44 — supplier payment RPC
--
-- Paste into the Supabase SQL editor and run ONCE.
--
-- PREREQUISITE: migrations 34-43 already applied. This function calls
-- sales_assert_sufficient_funds (41) and sales_account_balance (40), and
-- references sales_goods_receipts (42).
--
-- Adds one function. No existing data is modified.
--
-- Verified on PostgreSQL 18 against a schema generated from the live Supabase
-- OpenAPI spec with migrations 34-43 applied: 24 assertions covering payment
-- on account, overdraft, cross-supplier guards, PO total recomputation,
-- closed-period blocking, rollback and re-apply. All pass.
-- ============================================================

-- ============================================================
-- Migration 44: Supplier Payment RPC
-- Author: Manifest System
-- Phase: 2 (Stock, Goods Receipts & Supplier Ledger)
--
-- Numbering: the plan allocates no migration to supplier payments — it assumes
-- the backend can insert the row directly. CLAUDE.md forbids that: money
-- mutations belong in an RPC, must be atomic, and must take SELECT ... FOR
-- UPDATE on the row they debit. This file therefore takes 44, which moves
-- Phase 3 to 45 and Phase 4 to 46. Record that before writing Phase 3.
--
-- This migration does NOT rewrite existing data. It adds one function.
--
-- WHAT IT FIXES
--
-- recordProcurementPayment in payments.service.ts inserts a supplier payment
-- with no account_id at all. sales_account_ledger (migration 40) selects
-- procurement payments WHERE account_id IS NOT NULL, so every payment recorded
-- through that path is invisible to the ledger and never reduces the cash
-- position. Migration 34 back-filled account_id on the rows that existed then;
-- nothing has maintained it since. It also takes no lock and runs no overdraft
-- check, so two concurrent payments can each pass a balance test the other
-- invalidates.
--
-- It also cannot record a payment on account: procurement_request_id was
-- mandatory until migration 42 made it nullable, so paying a supplier without
-- naming a purchase order was impossible.
--
-- DELIBERATELY NOT ENFORCED: paying more than a goods receipt's outstanding
-- balance is allowed. Prepayment and payment on account are legitimate, and the
-- supplier statement already reports unapplied credit rather than losing it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sales_record_supplier_payment(
    p_manifest_id            UUID,
    p_supplier_id            UUID,
    p_amount                 NUMERIC,
    p_account_id             UUID,
    p_payment_method         TEXT,
    p_payment_date           DATE DEFAULT NULL,
    p_goods_receipt_id       UUID DEFAULT NULL,
    p_procurement_request_id UUID DEFAULT NULL,
    p_reference              TEXT DEFAULT NULL,
    p_notes                  TEXT DEFAULT NULL,
    p_created_by             TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_date       DATE := COALESCE(p_payment_date, (now() AT TIME ZONE 'Africa/Kampala')::date);
    v_payment_id UUID;
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

    PERFORM 1 FROM public.sales_suppliers
    WHERE id = p_supplier_id AND manifest_id = p_manifest_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_SUPPLIER_NOT_FOUND: %', p_supplier_id USING ERRCODE = 'P0002';
    END IF;

    -- A named receipt must belong to this manifest AND this supplier, so a
    -- payment cannot be attached to another supplier's document.
    IF p_goods_receipt_id IS NOT NULL THEN
        PERFORM 1 FROM public.sales_goods_receipts
        WHERE id = p_goods_receipt_id
          AND manifest_id = p_manifest_id
          AND supplier_id = p_supplier_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'SALES_GOODS_RECEIPT_NOT_FOUND: % for supplier %', p_goods_receipt_id, p_supplier_id
                USING ERRCODE = 'P0002';
        END IF;
    END IF;

    IF p_procurement_request_id IS NOT NULL THEN
        PERFORM 1 FROM public.sales_procurement_requests
        WHERE id = p_procurement_request_id
          AND manifest_id = p_manifest_id
          AND supplier_id = p_supplier_id
        FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'SALES_REQUEST_NOT_FOUND: % for supplier %', p_procurement_request_id, p_supplier_id
                USING ERRCODE = 'P0002';
        END IF;
    END IF;

    -- Lock the account before the overdraft check: sales_assert_sufficient_funds
    -- does not take its own lock and is only safe once the caller holds one.
    PERFORM 1 FROM public.sales_money_accounts
    WHERE id = p_account_id AND manifest_id = p_manifest_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_ACCOUNT_NOT_FOUND: %', p_account_id USING ERRCODE = 'P0002';
    END IF;

    PERFORM public.sales_assert_sufficient_funds(p_account_id, p_amount);

    -- The closed-period trigger on sales_procurement_payments fires here and
    -- raises SALES_PERIOD_CLOSED (P0001) if v_date falls in a closed month.
    INSERT INTO public.sales_procurement_payments (
        manifest_id, supplier_id, procurement_request_id, goods_receipt_id,
        amount, payment_method, payment_date, transaction_reference,
        notes, account_id, recorded_by
    )
    VALUES (
        p_manifest_id, p_supplier_id, p_procurement_request_id, p_goods_receipt_id,
        p_amount, p_payment_method, v_date, p_reference,
        p_notes, p_account_id, p_created_by
    )
    RETURNING id INTO v_payment_id;

    -- Keep the denormalised totals on the purchase order in step, using the
    -- same arithmetic as updateProcurementFinancialTotals in the service layer.
    -- Done here so it shares the transaction rather than drifting on a failure.
    -- These columns become redundant once the financial position is computed
    -- from the supplier ledger; until then the procurement screens read them.
    IF p_procurement_request_id IS NOT NULL THEN
        SELECT COALESCE(round(SUM(i.expected_cost * i.quantity_ordered)), 0)
        INTO v_total
        FROM public.sales_procurement_request_items i
        WHERE i.request_id = p_procurement_request_id;

        SELECT COALESCE(round(SUM(pp.amount)), 0)
        INTO v_paid
        FROM public.sales_procurement_payments pp
        WHERE pp.procurement_request_id = p_procurement_request_id;

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
        WHERE id = p_procurement_request_id;
    END IF;

    RETURN jsonb_build_object(
        'payment_id',             v_payment_id,
        'supplier_id',            p_supplier_id,
        'amount',                 p_amount,
        'payment_date',           v_date,
        'account_id',             p_account_id,
        'goods_receipt_id',       p_goods_receipt_id,
        'procurement_request_id', p_procurement_request_id,
        'account_balance',        public.sales_account_balance(p_account_id),
        'request_balance_due',    v_balance
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sales_record_supplier_payment(UUID, UUID, NUMERIC, UUID, TEXT, DATE, UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.sales_record_supplier_payment(UUID, UUID, NUMERIC, UUID, TEXT, DATE, UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
