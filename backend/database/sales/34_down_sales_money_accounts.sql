-- ============================================================
-- Rollback for Migration 34: money accounts and payment linkage
--
-- READ THIS BEFORE RUNNING.
--
-- Migration 34 rewrote payment_method values in place:
--   'Bank Transfer' -> 'Bank'
--   'Mobile Money'  -> 'Airtel Money' or 'MTN Mobile Money'
-- The original strings were not kept anywhere, so this rollback CANNOT restore
-- them. It widens the check constraint to accept both the old and the new
-- vocabulary instead, which leaves the database working but historically
-- rewritten. If you need the original strings back, restore from the backup
-- taken before migration 34 was applied.
--
-- Run 35_down through 41_down first: refunds, expenses, other transactions and
-- transfers all reference sales_money_accounts.
-- ============================================================

ALTER TABLE public.sales_payments              DROP CONSTRAINT IF EXISTS sales_payments_payment_method_check;
ALTER TABLE public.sales_procurement_payments  DROP CONSTRAINT IF EXISTS sales_procurement_payments_payment_method_check;

DROP INDEX IF EXISTS public.idx_sales_payments_account;
DROP INDEX IF EXISTS public.idx_sales_procurement_payments_account;

ALTER TABLE public.sales_payments             DROP COLUMN IF EXISTS account_id;
ALTER TABLE public.sales_procurement_payments DROP COLUMN IF EXISTS account_id;

DROP TABLE IF EXISTS public.sales_money_accounts CASCADE;

-- Permissive constraint covering both vocabularies.
ALTER TABLE public.sales_payments
    ADD CONSTRAINT sales_payments_payment_method_check
    CHECK (payment_method IN ('Cash', 'Mobile Money', 'MTN Mobile Money', 'Airtel Money',
                              'Bank', 'Bank Transfer', 'Card', 'Other'));

ALTER TABLE public.sales_procurement_payments
    ADD CONSTRAINT sales_procurement_payments_payment_method_check
    CHECK (payment_method IN ('Cash', 'Mobile Money', 'MTN Mobile Money', 'Airtel Money',
                              'Bank', 'Bank Transfer', 'Card', 'Other'));
