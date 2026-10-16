-- ============================================================
-- Rollback for Migration 35: refunds
--
-- Destructive: refund history is dropped. Orders keep whatever amount_paid
-- they currently hold; the refunds that produced those figures are gone.
-- ============================================================

DROP TABLE IF EXISTS public.sales_refunds CASCADE;
