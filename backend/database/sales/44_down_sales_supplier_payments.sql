-- ============================================================
-- Rollback for Migration 44: supplier payment RPC
--
-- Drops one function. No data is touched: payment rows written through it stay
-- exactly as they are, with their account_id and their link to a goods receipt
-- or purchase order intact.
--
-- What rolling back DOES cost: the only safe path for recording a supplier
-- payment goes away. Callers fall back to recordProcurementPayment in
-- payments.service.ts, which writes no account_id — so payments recorded after
-- this rollback become invisible to sales_account_ledger and stop reducing the
-- cash position — and which takes no lock and runs no overdraft check.
--
-- Denormalised totals on sales_procurement_requests that the RPC recomputed are
-- left as they are. They are a cache of the payment rows, so they stay correct.
-- ============================================================

DROP FUNCTION IF EXISTS public.sales_record_supplier_payment(UUID, UUID, NUMERIC, UUID, TEXT, DATE, UUID, UUID, TEXT, TEXT, TEXT);
