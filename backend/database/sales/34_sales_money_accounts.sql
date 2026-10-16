-- ============================================================
-- Migration 34: Sales Money Accounts & Payment Linkage
-- Author: Manifest System
-- Phase: 1 (Money Management)
--
-- !! THIS MIGRATION REWRITES EXISTING DATA IN PLACE. TAKE A BACKUP FIRST. !!
-- Section 5 overwrites payment_method on sales_payments and
-- sales_procurement_payments:
--   'Bank Transfer' -> 'Bank'
--   'Mobile Money'  -> 'Airtel Money' (reference mentions airtel) else 'MTN Mobile Money'
-- The original strings are not preserved anywhere. 34_down CANNOT restore them;
-- it only widens the check constraint to accept both vocabularies. Recovering
-- the original values requires the pre-migration backup.
-- ============================================================

-- 1. Create Money Accounts Table
CREATE TABLE IF NOT EXISTS public.sales_money_accounts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id          UUID NOT NULL,
    name                 TEXT NOT NULL,                 -- 'Cash', 'MTN Mobile Money', 'Airtel Money', 'Bank'
    account_type         TEXT NOT NULL CHECK (account_type IN ('CASH', 'MOBILE_MONEY', 'BANK')),
    provider             TEXT,                          -- 'MTN', 'Airtel', or bank name
    account_number       TEXT,                          -- phone / bank a/c (display last 4 only)
    opening_balance      NUMERIC(15, 2) NOT NULL DEFAULT 0,
    opening_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ DEFAULT now(),
    created_by           TEXT,
    UNIQUE (manifest_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sales_money_accounts_manifest ON public.sales_money_accounts(manifest_id);

-- Enable RLS
ALTER TABLE public.sales_money_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users on sales_money_accounts" 
    ON public.sales_money_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service_role on sales_money_accounts" 
    ON public.sales_money_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Seed Default 4 Accounts for all existing manifests in Sales tables
DO $$
DECLARE
    m_id UUID;
BEGIN
    FOR m_id IN 
        SELECT DISTINCT manifest_id FROM (
            SELECT manifest_id FROM public.sales_products WHERE manifest_id IS NOT NULL
            UNION
            SELECT manifest_id FROM public.sales_orders WHERE manifest_id IS NOT NULL
            UNION
            SELECT manifest_id FROM public.sales_procurement_requests WHERE manifest_id IS NOT NULL
        ) t
    LOOP
        INSERT INTO public.sales_money_accounts (manifest_id, name, account_type, provider, opening_balance)
        VALUES 
            (m_id, 'Cash', 'CASH', NULL, 0),
            (m_id, 'MTN Mobile Money', 'MOBILE_MONEY', 'MTN', 0),
            (m_id, 'Airtel Money', 'MOBILE_MONEY', 'Airtel', 0),
            (m_id, 'Bank', 'BANK', NULL, 0)
        ON CONFLICT (manifest_id, name) DO NOTHING;
    END LOOP;
END $$;

-- 3. Add account_id to sales_payments and sales_procurement_payments
ALTER TABLE public.sales_payments
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.sales_money_accounts(id);

ALTER TABLE public.sales_procurement_payments
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.sales_money_accounts(id);

CREATE INDEX IF NOT EXISTS idx_sales_payments_account ON public.sales_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_procurement_payments_account ON public.sales_procurement_payments(account_id);

-- 4. Drop legacy method check constraints
ALTER TABLE public.sales_procurement_payments
    DROP CONSTRAINT IF EXISTS sales_procurement_payments_payment_method_check;
ALTER TABLE public.sales_payments
    DROP CONSTRAINT IF EXISTS sales_payments_payment_method_check;

-- 5. Backfill historical records
-- Normalize 'Bank Transfer' -> 'Bank'
UPDATE public.sales_procurement_payments
SET payment_method = 'Bank'
WHERE payment_method ILIKE '%Bank Transfer%';

UPDATE public.sales_payments
SET payment_method = 'Bank'
WHERE payment_method ILIKE '%Bank Transfer%';

-- Normalize legacy 'Mobile Money' -> 'Airtel Money' if reference mentions airtel, else 'MTN Mobile Money'
UPDATE public.sales_payments
SET payment_method = CASE 
    WHEN reference ILIKE '%airtel%' THEN 'Airtel Money'
    ELSE 'MTN Mobile Money'
END
WHERE payment_method = 'Mobile Money' OR payment_method = 'MOBILE_MONEY' OR payment_method = 'MOBILE MONEY';

UPDATE public.sales_procurement_payments
SET payment_method = CASE 
    WHEN transaction_reference ILIKE '%airtel%' THEN 'Airtel Money'
    ELSE 'MTN Mobile Money'
END
WHERE payment_method = 'Mobile Money' OR payment_method = 'MOBILE_MONEY' OR payment_method = 'MOBILE MONEY';

-- Set account_id based on payment_method for each record
UPDATE public.sales_payments sp
SET account_id = sma.id
FROM public.sales_money_accounts sma
WHERE sp.manifest_id = sma.manifest_id
  AND (
      (sp.payment_method = 'Cash' AND sma.name = 'Cash') OR
      (sp.payment_method = 'MTN Mobile Money' AND sma.name = 'MTN Mobile Money') OR
      (sp.payment_method = 'Airtel Money' AND sma.name = 'Airtel Money') OR
      ((sp.payment_method = 'Bank' OR sp.payment_method = 'Card') AND sma.name = 'Bank') OR
      (sp.payment_method = 'Other' AND sma.name = 'Cash')
  )
  AND sp.account_id IS NULL;

UPDATE public.sales_procurement_payments spp
SET account_id = sma.id
FROM public.sales_money_accounts sma
WHERE spp.manifest_id = sma.manifest_id
  AND (
      (spp.payment_method = 'Cash' AND sma.name = 'Cash') OR
      (spp.payment_method = 'MTN Mobile Money' AND sma.name = 'MTN Mobile Money') OR
      (spp.payment_method = 'Airtel Money' AND sma.name = 'Airtel Money') OR
      ((spp.payment_method = 'Bank' OR spp.payment_method = 'Card') AND sma.name = 'Bank') OR
      (spp.payment_method = 'Other' AND sma.name = 'Cash')
  )
  AND spp.account_id IS NULL;

-- 6. Apply strict unified CHECK constraints on payment_method
ALTER TABLE public.sales_procurement_payments
    ADD CONSTRAINT sales_procurement_payments_payment_method_check
    CHECK (payment_method IN ('Cash', 'MTN Mobile Money', 'Airtel Money', 'Bank', 'Card', 'Other'));

ALTER TABLE public.sales_payments
    ADD CONSTRAINT sales_payments_payment_method_check
    CHECK (payment_method IN ('Cash', 'MTN Mobile Money', 'Airtel Money', 'Bank', 'Card', 'Other'));
