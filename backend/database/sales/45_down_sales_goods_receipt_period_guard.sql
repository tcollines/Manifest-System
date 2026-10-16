-- ============================================================
-- 45_down_sales_goods_receipt_period_guard.sql
--
-- Rolls back 45 by detaching the goods-receipt trigger and restoring
-- fn_check_sales_closed_period() to its migration-41 form.
--
-- WHAT THIS CANNOT RESTORE
-- ------------------------
-- Nothing needs restoring: migration 45 rewrote no data. It only added a
-- guard.
--
-- WHAT RUNNING THIS COSTS YOU
-- ---------------------------
-- After this rollback a CREDIT goods receipt can once again be recorded into a
-- closed month, silently adding stock and a payable to a period that has
-- already been reported. PAID and PART_PAID receipts stay guarded, because
-- their payment row still trips the trigger on sales_procurement_payments — so
-- the hole reopens for exactly one receipt type and will not be obvious.
--
-- Any receipt written into a closed month while this rollback is in effect
-- stays there; re-applying 45 does not remove it.
-- ============================================================

DROP TRIGGER IF EXISTS trg_check_closed_sales_goods_receipts ON public.sales_goods_receipts;

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
