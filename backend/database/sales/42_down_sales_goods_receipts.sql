-- ============================================================
-- Rollback for Migration 42: goods receipts and supplier ledger linkage
--
-- READ THIS BEFORE RUNNING.
--
-- Dropping sales_goods_receipts cascades to sales_goods_receipt_items, so every
-- receipt line goes with it. This rollback CANNOT restore:
--
--   * the stock_quantity that receipts added to sales_product_variants - the
--     increments stay, because reversing them blindly would clobber every sale
--     and adjustment booked since;
--   * quantity_received on sales_procurement_request_items, and the status the
--     requests were rolled forward to, for the same reason;
--   * reserved_quantity and the RESERVED status on orders that a receipt
--     released from WAITING_SUPPLIER.
--
-- The sales_inventory_movements rows written by receipts are left in place as
-- the audit trail of what was added. If you need the stock figures back, take
-- them from those IN movements, or restore from a backup.
--
-- Procurement payments that pointed at a receipt are NOT deleted; their
-- goods_receipt_id column is dropped, so they remain as supplier payments with
-- their amount and account intact.
--
-- procurement_request_id is restored to NOT NULL. If any payment was recorded
-- on account with no PO while migration 42 was live, that restore FAILS until
-- those rows are given a request or removed. This is deliberate - it refuses
-- rather than inventing a link.
-- ============================================================

DROP FUNCTION IF EXISTS public.sales_record_goods_receipt(UUID, UUID, JSONB, TEXT, DATE, UUID, TEXT, NUMERIC, UUID, TEXT, TEXT, TEXT, TEXT);

DROP INDEX IF EXISTS public.idx_sales_procurement_payments_grn;
DROP INDEX IF EXISTS public.idx_sales_procurement_payments_supplier;

ALTER TABLE public.sales_procurement_payments
    DROP COLUMN IF EXISTS goods_receipt_id;

-- Fails loudly if any on-account payment has no procurement request. See header.
ALTER TABLE public.sales_procurement_payments
    ALTER COLUMN procurement_request_id SET NOT NULL;

DROP TABLE IF EXISTS public.sales_goods_receipt_items;
DROP TABLE IF EXISTS public.sales_goods_receipts CASCADE;
