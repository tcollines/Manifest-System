-- ============================================================
-- 47_down_sales_supplier_payment_edit_delete.sql
--
-- Rolls back 47: drops the edit and delete RPCs and restores
-- fn_check_sales_closed_period() to its migration-45 form, which checks only
-- NEW on an UPDATE. The function body below is byte-identical to 45.
--
-- WHAT THIS CANNOT RESTORE
-- ------------------------
-- Nothing needs restoring: migration 47 rewrote no data. Payments already
-- edited or deleted through the RPCs stay as they are -- a deleted payment is
-- gone, and an edited one keeps its new values. Dropping the functions only
-- removes the ability to do it again.
--
-- WHAT RUNNING THIS COSTS YOU
-- ---------------------------
-- 1. Supplier payments become uneditable and undeletable again. Nothing in the
--    API will reach the dropped functions; the endpoints return a 500 from
--    Postgres until the backend is rolled back with them.
--
-- 2. The period guard goes back to reading only NEW on an UPDATE. Any row in
--    any of the seven guarded tables can then be edited out of a closed month
--    by giving it a date in an open one, silently restating a period that has
--    already been reported. That hole is wider than supplier payments -- it
--    applies to sales_payments, sales_refunds, sales_expenses,
--    sales_other_transactions, sales_fund_transfers and sales_goods_receipts
--    as well -- so prefer keeping the trigger fix even if the RPCs go.
--    To drop only the RPCs, run the two DROP statements and stop.
-- ============================================================

DROP FUNCTION IF EXISTS public.sales_update_supplier_payment(UUID, UUID, NUMERIC, UUID, TEXT, DATE, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.sales_delete_supplier_payment(UUID, UUID, TEXT);

-- Everything below restores the migration-45 period guard. Omit it if you are
-- only removing the RPCs.

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
