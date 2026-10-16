-- ============================================================
-- Rollback for Migration 40: ledger view and balance helpers
--
-- Run 41_down first: sales_assert_sufficient_funds depends on
-- sales_account_balance.
-- ============================================================

DROP FUNCTION IF EXISTS public.sales_account_balance(UUID);
DROP FUNCTION IF EXISTS public.sales_account_balance_asof(UUID, DATE);
DROP VIEW     IF EXISTS public.sales_account_ledger;
