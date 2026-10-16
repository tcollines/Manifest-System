-- ============================================================
-- DATA_cleanup_sentinel_payments.sql
--
-- NOT a numbered migration, deliberately. This names four specific row ids in
-- one specific database. Numbering it would put it in the sequence every
-- environment replays, where those ids do not exist. Run it once, here.
--
-- THIS SCRIPT DELETES DATA. Read the restore block before running it.
--
-- WHAT IT DELETES
--
-- 1. Three supplier payments carrying the sentinel manifest
--    '00000000-0000-0000-0000-000000000000' while pointing at purchase orders
--    owned by other manifests. They also reference supplier
--    e6dcb7a7-... and account 5a20a924-..., both of which are sentinel-manifest
--    rows -- a second "Phaneroo Ministries International" supplier and a second
--    "Cash" account, distinct from the Sales manifest's own. Confirmed test
--    leftovers.
--
-- 2. One 1 UGX payment, reference 'MIG46-PROBE', written deliberately to prove
--    migration 46 was applied (it was: the roll-up excluded the sentinel row).
--
-- WHAT IT THEN DOES
--
-- Recomputes total_amount, amount_paid, balance_due and payment_status on the
-- three affected orders, scoped by manifest, matching
-- updateProcurementFinancialTotals and the migration-46 RPC.
--
-- Expected end state:
--   4719b1b4  total 45,000   paid 0        due 45,000   UNPAID
--   5e4c96e1  total 349,000  paid 0        due 349,000  UNPAID
--   2f7873b8  total 275,000  paid 274,000  due 1,000    PARTIAL
--   Sales "Cash" account back to 880,000
--
-- Account balances need no correction. sales_account_ledger is a plain VIEW
-- and sales_account_balance sums it live, so removing a payment row removes
-- its ledger entry and the balance rises by that amount on its own.
--
-- WHAT THIS CANNOT RESTORE
--
-- Re-running the INSERTs at the bottom puts the four payment rows back exactly
-- as they were, including ids and timestamps. Re-run the recompute afterwards
-- to match. Nothing else is touched: no account, supplier or order row is
-- deleted, and the sentinel-manifest "Cash" account 5a20a924-... is left in
-- place because six rows in sales_payments still reference it.
-- ============================================================

BEGIN;

DELETE FROM public.sales_procurement_payments
WHERE id IN (
    'c3bf21ae-73a3-4dde-946c-bd2e117357bd',  -- 30,000  sentinel -> order in afc0240b
    '65c0d787-6691-49a6-89ae-07017024ee8e',  -- 349,000 sentinel -> order in afc0240b
    'b7de1b6a-4174-4b8c-9fd2-c6644f281e4e',  -- 1,000   sentinel -> order in 593fbdbb
    '23a6e9c4-cc56-4bc8-bcc7-98c414871ed3'   -- 1       MIG46-PROBE
);

WITH target AS (
    SELECT r.id, r.manifest_id
    FROM public.sales_procurement_requests r
    WHERE r.id IN (
        '4719b1b4-1219-4aa0-b363-7f791ec92eb7',
        '5e4c96e1-964f-41c0-8003-0c9acfa1cd17',
        '2f7873b8-79e9-43e9-a42c-7fb6eababfed'
    )
),
recomputed AS (
    SELECT
        t.id,
        t.manifest_id,
        COALESCE((
            SELECT round(SUM(i.expected_cost * i.quantity_ordered))
            FROM public.sales_procurement_request_items i
            WHERE i.request_id = t.id
        ), 0) AS total,
        COALESCE((
            SELECT round(SUM(pp.amount))
            FROM public.sales_procurement_payments pp
            WHERE pp.procurement_request_id = t.id
              AND pp.manifest_id = t.manifest_id
        ), 0) AS paid
    FROM target t
)
UPDATE public.sales_procurement_requests r
SET total_amount   = c.total,
    amount_paid    = c.paid,
    balance_due    = GREATEST(0, c.total - c.paid),
    payment_status = CASE
        WHEN GREATEST(0, c.total - c.paid) = 0 AND c.total > 0 THEN 'PAID'
        WHEN c.total = 0 AND c.paid = 0                        THEN 'PAID'
        WHEN c.paid > 0 AND GREATEST(0, c.total - c.paid) > 0  THEN 'PARTIAL'
        ELSE 'UNPAID'
    END
FROM recomputed c
WHERE r.id = c.id AND r.manifest_id = c.manifest_id;

COMMIT;

-- ============================================================
-- VERIFY (run after COMMIT; all three should read as expected above)
-- ============================================================
-- SELECT left(id::text, 8) AS po, total_amount, amount_paid, balance_due, payment_status
-- FROM public.sales_procurement_requests
-- WHERE id IN ('4719b1b4-1219-4aa0-b363-7f791ec92eb7',
--              '5e4c96e1-964f-41c0-8003-0c9acfa1cd17',
--              '2f7873b8-79e9-43e9-a42c-7fb6eababfed');
--
-- -- expect 0
-- SELECT count(*) AS sentinel_payments_left
-- FROM public.sales_procurement_payments
-- WHERE manifest_id = '00000000-0000-0000-0000-000000000000';
--
-- -- expect 0: no payment may sit in a different manifest from its order
-- SELECT count(*) AS cross_manifest_payments
-- FROM public.sales_procurement_payments pp
-- JOIN public.sales_procurement_requests r ON r.id = pp.procurement_request_id
-- WHERE r.manifest_id <> pp.manifest_id;
--
-- -- expect 880000
-- SELECT public.sales_account_balance('85721777-e005-4027-b9ab-17ab44759e72') AS cash;

-- ============================================================
-- RESTORE (only if the deletions above were a mistake)
-- ============================================================
-- INSERT INTO public.sales_procurement_payments (id, manifest_id, procurement_request_id, supplier_id, amount, payment_method, payment_date, transaction_reference, notes, recorded_by, created_at, account_id, goods_receipt_id)
-- VALUES ('c3bf21ae-73a3-4dde-946c-bd2e117357bd', '00000000-0000-0000-0000-000000000000', '4719b1b4-1219-4aa0-b363-7f791ec92eb7', 'e6dcb7a7-5c09-4d3c-b203-9697d7417e7a', 30000, 'Cash', '2026-05-24T18:50:40.025649+00:00', 'Initial Payment', 'Recorded during PO creation', 'Abraham', '2026-05-24T18:50:40.025649+00:00', '5a20a924-078f-4636-bc15-5ec52075dbc1', NULL);
-- INSERT INTO public.sales_procurement_payments (id, manifest_id, procurement_request_id, supplier_id, amount, payment_method, payment_date, transaction_reference, notes, recorded_by, created_at, account_id, goods_receipt_id)
-- VALUES ('65c0d787-6691-49a6-89ae-07017024ee8e', '00000000-0000-0000-0000-000000000000', '5e4c96e1-964f-41c0-8003-0c9acfa1cd17', 'e6dcb7a7-5c09-4d3c-b203-9697d7417e7a', 349000, 'Cash', '2026-05-24T18:53:28.080232+00:00', NULL, NULL, 'Abraham', '2026-05-24T18:53:28.080232+00:00', '5a20a924-078f-4636-bc15-5ec52075dbc1', NULL);
-- INSERT INTO public.sales_procurement_payments (id, manifest_id, procurement_request_id, supplier_id, amount, payment_method, payment_date, transaction_reference, notes, recorded_by, created_at, account_id, goods_receipt_id)
-- VALUES ('b7de1b6a-4174-4b8c-9fd2-c6644f281e4e', '00000000-0000-0000-0000-000000000000', '2f7873b8-79e9-43e9-a42c-7fb6eababfed', 'e6dcb7a7-5c09-4d3c-b203-9697d7417e7a', 1000, 'Cash', '2026-06-09T22:02:47.272932+00:00', NULL, NULL, 'Abraham', '2026-06-09T22:02:47.272932+00:00', '5a20a924-078f-4636-bc15-5ec52075dbc1', NULL);
-- INSERT INTO public.sales_procurement_payments (id, manifest_id, procurement_request_id, supplier_id, amount, payment_method, payment_date, transaction_reference, notes, recorded_by, created_at, account_id, goods_receipt_id)
-- VALUES ('23a6e9c4-cc56-4bc8-bcc7-98c414871ed3', '593fbdbb-8211-44ca-b3e2-8d999c88680c', '2f7873b8-79e9-43e9-a42c-7fb6eababfed', 'fddd6729-0509-4f8c-aadf-cf55319082ef', 1, 'Cash', '2026-09-20T00:00:00+00:00', 'MIG46-PROBE', 'one-shilling probe to confirm migration 46 is live', 'migration-46 verification', '2026-09-20T16:57:05.07003+00:00', '85721777-e005-4027-b9ab-17ab44759e72', NULL);
