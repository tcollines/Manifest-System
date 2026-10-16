-- ============================================================
-- Rollback for Migration 38: period closes, sequences, closed-period trigger
-- ============================================================

DROP TRIGGER IF EXISTS trg_check_closed_sales_transfers    ON public.sales_fund_transfers;
DROP TRIGGER IF EXISTS trg_check_closed_sales_other_txns   ON public.sales_other_transactions;
DROP TRIGGER IF EXISTS trg_check_closed_sales_expenses     ON public.sales_expenses;
DROP TRIGGER IF EXISTS trg_check_closed_sales_proc_payments ON public.sales_procurement_payments;
DROP TRIGGER IF EXISTS trg_check_closed_sales_refunds      ON public.sales_refunds;
DROP TRIGGER IF EXISTS trg_check_closed_sales_payments     ON public.sales_payments;

DROP FUNCTION IF EXISTS public.fn_check_sales_closed_period();
DROP FUNCTION IF EXISTS public.sales_get_next_sequence(UUID, TEXT, INT);

DROP TABLE IF EXISTS public.sales_number_sequences;
DROP TABLE IF EXISTS public.sales_period_closes;
