-- ============================================================
-- Rollback for Migration 36: expense categories and expenses
--
-- Destructive: every expense, approved or not, is dropped. Export
-- sales_expenses before running this if the month is not yet reconciled.
-- ============================================================

DROP TABLE IF EXISTS public.sales_expenses CASCADE;
DROP TABLE IF EXISTS public.sales_expense_categories CASCADE;
