-- ============================================================
-- Rollback for Migration 39: Sales Targets
--
-- Destructive: every target, including ones entered by hand, is dropped with
-- the table. Export sales_targets first if the figures matter.
-- ============================================================

DROP TABLE IF EXISTS public.sales_targets CASCADE;
