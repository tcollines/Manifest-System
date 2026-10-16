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
