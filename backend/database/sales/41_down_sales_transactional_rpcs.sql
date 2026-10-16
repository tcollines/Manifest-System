-- ============================================================
-- Rollback for Migration 41: Phase 1 Transactional RPCs
-- ============================================================

DROP FUNCTION IF EXISTS public.sales_complete_stock_take(UUID, UUID, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.sales_fulfill_order(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.sales_process_refund(UUID, UUID, NUMERIC, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.sales_record_payment(UUID, UUID, NUMERIC, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.sales_process_checkout(UUID, JSONB, NUMERIC, UUID, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.sales_approve_expense(UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.sales_record_transfer(UUID, UUID, UUID, NUMERIC, NUMERIC, DATE, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.sales_assert_sufficient_funds(UUID, NUMERIC);

-- Restore the migration-38 closed-period trigger function verbatim, so the
-- triggers attached in migration 38 keep working after this rollback.
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
