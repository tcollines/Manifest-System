-- ============================================================
-- Migration 46: Scope the supplier-payment roll-up to the manifest
-- Author: Manifest System
-- Phase: none. Like 44 and 45 this is an after-the-fact correction, not a
--        plan phase. Plan Phase 3 has still not been written; it starts at 47.
--
-- This migration does NOT rewrite existing data. It replaces one function.
-- The denormalised totals already wrong on existing purchase orders stay
-- wrong until those rows are corrected deliberately -- see WHAT THIS DOES NOT
-- FIX below.
--
-- WHAT IT FIXES
--
-- sales_record_supplier_payment recomputes total_amount, amount_paid,
-- balance_due and payment_status on the purchase order inside its own
-- transaction. The SUM over sales_procurement_payments filtered on
-- procurement_request_id alone, with no manifest_id, so it counted payment
-- rows belonging to other manifests. That breaks the CLAUDE.md rule that every
-- query filters on manifest_id, and it is not hypothetical: purchase order
-- 2f7873b8 in manifest 593fbdbb has a 1,000 payment row carrying the sentinel
-- manifest '00000000-0000-0000-0000-000000000000', which pushed the order to
-- amount_paid = 275,000 and payment_status = 'PAID' when this manifest had
-- paid 274,000.
--
-- The closing UPDATE is scoped too. The request is already checked against
-- p_manifest_id earlier in the function, so that one is defence in depth
-- rather than a live hole.
--
-- Everything else in the function is byte-identical to migration 44.
--
-- WHAT THIS DOES NOT FIX
--
-- Rows already written. After applying this, a purchase order's totals are
-- only corrected the next time a payment is recorded against it. Orders whose
-- totals are already wrong need correcting on their own, and the payment rows
-- sitting in the wrong manifest need attributing to the right one first --
-- that is a data decision, not a schema one.
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

        -- Migration 46: scoped to the manifest. Without this the sum counted
        -- every payment row pointing at the request whatever manifest it
        -- belonged to, and legacy rows carry the sentinel manifest
        -- '00000000-...' or, in a few cases, a department id.
        SELECT COALESCE(round(SUM(pp.amount)), 0)
        INTO v_paid
        FROM public.sales_procurement_payments pp
        WHERE pp.procurement_request_id = p_procurement_request_id
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
        WHERE id = p_procurement_request_id
          AND manifest_id = p_manifest_id;
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
