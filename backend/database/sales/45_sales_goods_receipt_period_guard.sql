-- ============================================================
-- 45_sales_goods_receipt_period_guard.sql
--
-- Closes the last hole in the period-close guard: goods receipts.
--
-- WHY THIS IS NEEDED
-- ------------------
-- Migration 38 attached fn_check_sales_closed_period() to six tables:
-- sales_payments, sales_refunds, sales_procurement_payments, sales_expenses,
-- sales_other_transactions and sales_fund_transfers. sales_goods_receipts did
-- not exist then — it arrived in migration 42 — and no trigger was ever
-- attached to it.
--
-- The consequence is asymmetric and easy to miss:
--
--   * A PAID or PART_PAID receipt writes a sales_procurement_payments row, so
--     the existing trigger fires and a closed month is correctly refused.
--   * A CREDIT receipt writes NO payment row. Nothing fires. Stock and a
--     payable land in a month that has already been closed and reported.
--
-- So the books could be restated after the fact by exactly the receipt type
-- that raises a liability without moving cash. This migration attaches the
-- guard to sales_goods_receipts so all three payment terms behave alike.
--
-- WHAT IT CHANGES
-- ---------------
-- 1. Adds one branch to fn_check_sales_closed_period()'s date lookup:
--    sales_goods_receipts is dated by received_date, a DATE column, so it is
--    read the same way as sales_expenses.expense_date — no timezone shift,
--    because a calendar date is already a Kampala date. Applying an
--    AT TIME ZONE conversion to it would move receipts near a month boundary
--    into the wrong month.
-- 2. Attaches the trigger to sales_goods_receipts.
--
-- Everything else in the function is reproduced byte for byte from migration
-- 41. Nothing else is altered.
--
-- This migration does NOT rewrite existing data. Receipts already recorded in
-- a closed month stay exactly as they are; the guard only applies from here on.
--
-- NOT COVERED, DELIBERATELY
-- -------------------------
-- sales_goods_receipt_items carries no date of its own and is only ever written
-- by sales_record_goods_receipt() in the same transaction as its parent, which
-- is now guarded. Guarding the child as well would mean looking the parent's
-- received_date up per row for no additional protection.
-- ============================================================

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

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_closed_sales_goods_receipts ON public.sales_goods_receipts;
CREATE TRIGGER trg_check_closed_sales_goods_receipts
    BEFORE INSERT OR UPDATE OR DELETE ON public.sales_goods_receipts
    FOR EACH ROW EXECUTE FUNCTION public.fn_check_sales_closed_period();
