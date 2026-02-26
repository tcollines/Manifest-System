-- 1. Ensure composite index for fast lookup on the transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_event_tenant ON public.transactions(event_id, manifest_id);

-- 1.5 Add Transaction Type Check Constraint
-- Using common casing based on existing seeds/records
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS valid_transaction_type;

ALTER TABLE public.transactions
ADD CONSTRAINT valid_transaction_type
CHECK (type IN ('Income', 'Expense'));

-- 2. Create the RPC Function to compute aggregated totals
-- Needs to be aware of RLS, so it runs with SECURITY INVOKER by default.
-- Needs to accept the manifest_id and event_id.

CREATE OR REPLACE FUNCTION get_finance_event_summary(p_manifest_id UUID, p_event_id UUID)
RETURNS TABLE (
    total_income NUMERIC,
    total_expense NUMERIC,
    net_balance NUMERIC,
    transaction_count BIGINT
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount END), 0) AS total_expense,
        (COALESCE(SUM(CASE WHEN type = 'Income' THEN amount END), 0) - COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount END), 0)) AS net_balance,
        COUNT(*) AS transaction_count
    FROM public.transactions
    WHERE manifest_id = p_manifest_id 
      AND (p_event_id IS NULL OR event_id = p_event_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
