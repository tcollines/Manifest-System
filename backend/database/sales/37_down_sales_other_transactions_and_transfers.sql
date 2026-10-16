-- ============================================================
-- Rollback for Migration 37: other transactions and fund transfers
--
-- Destructive: every recorded transfer and other-money entry is dropped.
-- ============================================================

DROP TABLE IF EXISTS public.sales_fund_transfers CASCADE;
DROP TABLE IF EXISTS public.sales_other_transactions CASCADE;
