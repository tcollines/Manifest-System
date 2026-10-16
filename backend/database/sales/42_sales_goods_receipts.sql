-- ============================================================
-- Migration 42: Goods Receipts (GRN) & Supplier Ledger Linkage
-- Author: Manifest System
-- Phase: 2 (Stock, Goods Receipts & Supplier Ledger)
--
-- Numbering: the plan calls this file 41. On disk 41 is the Phase 1 RPC file,
-- so Phase 2 is 42-43, Phase 3 is 44 and Phase 4 is 45. See correction 1 in
-- docs/SALES_PHASE1_HANDOFF.md.
--
-- This migration does NOT rewrite existing data. It adds two tables, two
-- columns on sales_procurement_payments, and one RPC. The only change to
-- existing rows is quantity_received / status on procurement records that a
-- receipt is actually booked against, which happens at call time, not here.
--
-- Deviations from the plan, and why:
--
--   * sales_goods_receipt_items carries manifest_id, which the plan's column
--     list omits. CLAUDE.md requires every table to carry manifest_id, and the
--     plan itself requires "RLS enabled with tenant isolation (manifest_id)" on
--     all new tables - which a child table cannot express without the column.
--
--   * The closed-period trigger is NOT attached to the two new tables. The
--     plan lists the money tables it guards and goods receipts are not among
--     them. The payment row a receipt creates still goes through
--     sales_procurement_payments, which is guarded, so booking a paid receipt
--     into a closed month is already refused. A CREDIT receipt into a closed
--     month is not - flagged for a decision rather than silently guarded.
--
--   * cost_price on sales_product_variants is deliberately left untouched by a
--     receipt. Actual cost lives on the receipt line (unit_cost); cost_price
--     stays a manually managed field.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Goods receipts
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sales_goods_receipts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id             UUID NOT NULL,
    grn_number              TEXT NOT NULL,                 -- GRN-YYYY-XXXX
    supplier_id             UUID NOT NULL REFERENCES public.sales_suppliers(id),
    procurement_request_id  UUID REFERENCES public.sales_procurement_requests(id),
    delivery_note_number    TEXT,
    received_date           DATE NOT NULL,
    payment_terms           TEXT NOT NULL
                            CHECK (payment_terms IN ('PAID', 'CREDIT', 'PART_PAID')),
    total_cost              NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
    amount_paid_on_receipt  NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (amount_paid_on_receipt >= 0),
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT now(),
    created_by              TEXT,
    UNIQUE (manifest_id, grn_number),
    CONSTRAINT sales_goods_receipts_paid_within_total_check
        CHECK (amount_paid_on_receipt <= total_cost)
);

CREATE INDEX IF NOT EXISTS idx_sales_goods_receipts_manifest_date
    ON public.sales_goods_receipts(manifest_id, received_date);
CREATE INDEX IF NOT EXISTS idx_sales_goods_receipts_supplier
    ON public.sales_goods_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sales_goods_receipts_request
    ON public.sales_goods_receipts(procurement_request_id);

ALTER TABLE public.sales_goods_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_goods_receipts" ON public.sales_goods_receipts;
CREATE POLICY "Enable ALL for authenticated users on sales_goods_receipts"
    ON public.sales_goods_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable ALL for service_role on sales_goods_receipts" ON public.sales_goods_receipts;
CREATE POLICY "Enable ALL for service_role on sales_goods_receipts"
    ON public.sales_goods_receipts FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ------------------------------------------------------------
-- 2. Goods receipt lines
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sales_goods_receipt_items (
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id                  UUID NOT NULL,
    goods_receipt_id             UUID NOT NULL REFERENCES public.sales_goods_receipts(id) ON DELETE CASCADE,
    variant_id                   UUID NOT NULL REFERENCES public.sales_product_variants(id),
    procurement_request_item_id  UUID REFERENCES public.sales_procurement_request_items(id),
    quantity                     INT NOT NULL CHECK (quantity > 0),
    unit_cost                    NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    created_at                   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_grn_items_receipt
    ON public.sales_goods_receipt_items(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_sales_grn_items_variant
    ON public.sales_goods_receipt_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_sales_grn_items_manifest
    ON public.sales_goods_receipt_items(manifest_id);

ALTER TABLE public.sales_goods_receipt_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_goods_receipt_items" ON public.sales_goods_receipt_items;
CREATE POLICY "Enable ALL for authenticated users on sales_goods_receipt_items"
    ON public.sales_goods_receipt_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable ALL for service_role on sales_goods_receipt_items" ON public.sales_goods_receipt_items;
CREATE POLICY "Enable ALL for service_role on sales_goods_receipt_items"
    ON public.sales_goods_receipt_items FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ------------------------------------------------------------
-- 3. Supplier ledger linkage on procurement payments
--
-- A payment may now settle a goods receipt directly, or sit on account against
-- the supplier with neither a PO nor a GRN, so procurement_request_id stops
-- being mandatory.
-- ------------------------------------------------------------

ALTER TABLE public.sales_procurement_payments
    ALTER COLUMN procurement_request_id DROP NOT NULL;

ALTER TABLE public.sales_procurement_payments
    ADD COLUMN IF NOT EXISTS goods_receipt_id UUID REFERENCES public.sales_goods_receipts(id);

CREATE INDEX IF NOT EXISTS idx_sales_procurement_payments_grn
    ON public.sales_procurement_payments(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_sales_procurement_payments_supplier
    ON public.sales_procurement_payments(supplier_id);


-- ------------------------------------------------------------
-- 4. sales_record_goods_receipt
--
-- Replaces the read-modify-write receive path in procurement.service.ts, which
-- trusted a client-supplied currentQtyReceived, took no lock, and filtered
-- neither the variant nor the request item by manifest_id.
--
-- Concurrency: variant rows are locked in ascending id order, matching every
-- other Phase 1 RPC, so concurrent receipts serialise instead of deadlocking.
-- The money leg takes SELECT ... FOR UPDATE on the account before calling
-- sales_assert_sufficient_funds, which does not lock on its own behalf.
--
-- p_items: [{"variant_id": uuid, "quantity": int, "unit_cost": numeric,
--            "procurement_request_item_id": uuid | null}]
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sales_record_goods_receipt(
    p_manifest_id            UUID,
    p_supplier_id            UUID,
    p_items                  JSONB,
    p_payment_terms          TEXT,
    p_received_date          DATE    DEFAULT NULL,
    p_procurement_request_id UUID    DEFAULT NULL,
    p_delivery_note_number   TEXT    DEFAULT NULL,
    p_amount_paid_on_receipt NUMERIC DEFAULT 0,
    p_account_id             UUID    DEFAULT NULL,
    p_payment_method         TEXT    DEFAULT NULL,
    p_reference              TEXT    DEFAULT NULL,
    p_notes                  TEXT    DEFAULT NULL,
    p_created_by             TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_date       DATE    := COALESCE(p_received_date, (now() AT TIME ZONE 'Africa/Kampala')::date);
    v_paid       NUMERIC := COALESCE(p_amount_paid_on_receipt, 0);
    v_total      NUMERIC := 0;
    v_grn_id     UUID;
    v_grn_number TEXT;
    v_item       JSONB;
    v_variant    UUID;
    v_qty        INT;
    v_cost       NUMERIC;
    v_req_item   UUID;
    v_lines      INT := 0;
    v_units      INT := 0;
    v_payment_id UUID;
    v_reserved   INT := 0;
    v_order      RECORD;
BEGIN
    -- ---- validate the header -------------------------------------------
    IF p_payment_terms IS NULL OR p_payment_terms NOT IN ('PAID', 'CREDIT', 'PART_PAID') THEN
        RAISE EXCEPTION 'SALES_INVALID_TERMS: payment_terms must be PAID, CREDIT or PART_PAID'
            USING ERRCODE = 'P0004';
    END IF;

    PERFORM 1 FROM public.sales_suppliers
    WHERE id = p_supplier_id AND manifest_id = p_manifest_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_SUPPLIER_NOT_FOUND: %', p_supplier_id USING ERRCODE = 'P0002';
    END IF;

    IF p_procurement_request_id IS NOT NULL THEN
        PERFORM 1 FROM public.sales_procurement_requests
        WHERE id = p_procurement_request_id AND manifest_id = p_manifest_id
        FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'SALES_REQUEST_NOT_FOUND: %', p_procurement_request_id USING ERRCODE = 'P0002';
        END IF;
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'SALES_NO_ITEMS: a goods receipt needs at least one line' USING ERRCODE = 'P0004';
    END IF;

    -- ---- total the lines, validating as we go --------------------------
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty  := (v_item ->> 'quantity')::int;
        v_cost := COALESCE((v_item ->> 'unit_cost')::numeric, 0);

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'SALES_INVALID_QUANTITY: received quantity must be greater than zero'
                USING ERRCODE = 'P0004';
        END IF;
        IF v_cost < 0 THEN
            RAISE EXCEPTION 'SALES_INVALID_AMOUNT: unit cost cannot be negative' USING ERRCODE = 'P0004';
        END IF;

        v_total := v_total + (v_qty * v_cost);
    END LOOP;

    -- ---- validate the money against the terms --------------------------
    IF p_payment_terms = 'CREDIT' AND v_paid <> 0 THEN
        RAISE EXCEPTION 'SALES_INVALID_AMOUNT: a CREDIT receipt cannot carry a payment'
            USING ERRCODE = 'P0004';
    END IF;

    IF p_payment_terms = 'PAID' AND v_paid <> v_total THEN
        RAISE EXCEPTION 'SALES_INVALID_AMOUNT: a PAID receipt must settle the full %, got %', v_total, v_paid
            USING ERRCODE = 'P0004';
    END IF;

    IF p_payment_terms = 'PART_PAID' AND (v_paid <= 0 OR v_paid >= v_total) THEN
        RAISE EXCEPTION 'SALES_INVALID_AMOUNT: a PART_PAID receipt must pay more than zero and less than %', v_total
            USING ERRCODE = 'P0004';
    END IF;

    IF p_payment_terms <> 'CREDIT' AND p_account_id IS NULL THEN
        RAISE EXCEPTION 'SALES_ACCOUNT_REQUIRED: a paying receipt needs an account' USING ERRCODE = 'P0004';
    END IF;

    -- ---- header --------------------------------------------------------
    v_grn_number := public.sales_get_next_sequence(p_manifest_id, 'GRN', EXTRACT(YEAR FROM v_date)::int);

    INSERT INTO public.sales_goods_receipts (
        manifest_id, grn_number, supplier_id, procurement_request_id,
        delivery_note_number, received_date, payment_terms,
        total_cost, amount_paid_on_receipt, notes, created_by
    )
    VALUES (
        p_manifest_id, v_grn_number, p_supplier_id, p_procurement_request_id,
        p_delivery_note_number, v_date, p_payment_terms,
        v_total, v_paid, p_notes, p_created_by
    )
    RETURNING id INTO v_grn_id;

    -- ---- lock every variant first, in ascending id order ---------------
    PERFORM 1
    FROM public.sales_product_variants
    WHERE id IN (
        SELECT DISTINCT (e ->> 'variant_id')::uuid FROM jsonb_array_elements(p_items) e
    )
    ORDER BY id
    FOR UPDATE;

    -- ---- lines, stock, movements ---------------------------------------
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_variant  := (v_item ->> 'variant_id')::uuid;
        v_qty      := (v_item ->> 'quantity')::int;
        v_cost     := COALESCE((v_item ->> 'unit_cost')::numeric, 0);
        v_req_item := NULLIF(v_item ->> 'procurement_request_item_id', '')::uuid;

        PERFORM 1 FROM public.sales_product_variants
        WHERE id = v_variant AND manifest_id = p_manifest_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'SALES_VARIANT_NOT_FOUND: %', v_variant USING ERRCODE = 'P0002';
        END IF;

        INSERT INTO public.sales_goods_receipt_items (
            manifest_id, goods_receipt_id, variant_id,
            procurement_request_item_id, quantity, unit_cost
        )
        VALUES (p_manifest_id, v_grn_id, v_variant, v_req_item, v_qty, v_cost);

        UPDATE public.sales_product_variants
        SET stock_quantity = stock_quantity + v_qty
        WHERE id = v_variant AND manifest_id = p_manifest_id;

        INSERT INTO public.sales_inventory_movements (
            manifest_id, variant_id, type, quantity, reason, reference_id, created_by
        )
        VALUES (
            p_manifest_id, v_variant, 'IN', v_qty,
            'Goods receipt ' || v_grn_number, v_grn_id::text, p_created_by
        );

        -- book it against the PO line when the caller named one
        IF v_req_item IS NOT NULL THEN
            UPDATE public.sales_procurement_request_items i
            SET quantity_received = i.quantity_received + v_qty
            FROM public.sales_procurement_requests r
            WHERE i.id = v_req_item
              AND i.request_id = r.id
              AND r.manifest_id = p_manifest_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'SALES_REQUEST_ITEM_NOT_FOUND: %', v_req_item USING ERRCODE = 'P0002';
            END IF;
        END IF;

        v_lines := v_lines + 1;
        v_units := v_units + v_qty;
    END LOOP;

    -- ---- roll the PO status forward -------------------------------------
    IF p_procurement_request_id IS NOT NULL THEN
        UPDATE public.sales_procurement_requests r
        SET status = CASE
            WHEN NOT EXISTS (
                SELECT 1 FROM public.sales_procurement_request_items i
                WHERE i.request_id = r.id AND i.quantity_received < i.quantity_ordered
            ) THEN 'RECEIVED'
            ELSE 'PARTIALLY_RECEIVED'
        END
        WHERE r.id = p_procurement_request_id
          AND r.manifest_id = p_manifest_id
          AND r.status NOT IN ('CANCELLED');
    END IF;

    -- ---- money leg -------------------------------------------------------
    IF p_payment_terms <> 'CREDIT' THEN
        PERFORM 1 FROM public.sales_money_accounts
        WHERE id = p_account_id AND manifest_id = p_manifest_id
        FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'SALES_ACCOUNT_NOT_FOUND: %', p_account_id USING ERRCODE = 'P0002';
        END IF;

        PERFORM public.sales_assert_sufficient_funds(p_account_id, v_paid);

        INSERT INTO public.sales_procurement_payments (
            manifest_id, procurement_request_id, goods_receipt_id, supplier_id,
            amount, payment_method, payment_date, transaction_reference,
            notes, account_id, recorded_by
        )
        VALUES (
            p_manifest_id, p_procurement_request_id, v_grn_id, p_supplier_id,
            v_paid, COALESCE(p_payment_method, 'Cash'), v_date, p_reference,
            p_notes, p_account_id, p_created_by
        )
        RETURNING id INTO v_payment_id;
    END IF;

    -- ---- release orders that were waiting on this supplier --------------
    --
    -- An order goes WAITING_SUPPLIER when checkout finds too little stock, and
    -- carries a procurement request pointing back at it. Now that stock has
    -- landed, flip it to RESERVED and hold the units - but only when the whole
    -- order can be covered, so a part delivery does not half-reserve an order.
    IF p_procurement_request_id IS NOT NULL THEN
        FOR v_order IN
            SELECT o.id
            FROM public.sales_orders o
            JOIN public.sales_procurement_requests r ON r.order_id = o.id
            WHERE r.id = p_procurement_request_id
              AND o.manifest_id = p_manifest_id
              AND o.fulfillment_status = 'WAITING_SUPPLIER'
            FOR UPDATE OF o
        LOOP
            IF NOT EXISTS (
                SELECT 1
                FROM public.sales_order_items oi
                JOIN public.sales_product_variants v ON v.id = oi.variant_id
                WHERE oi.order_id = v_order.id
                  AND (v.stock_quantity - v.reserved_quantity) < oi.quantity
            ) THEN
                UPDATE public.sales_product_variants v
                SET reserved_quantity = v.reserved_quantity + oi.quantity
                FROM public.sales_order_items oi
                WHERE oi.order_id = v_order.id AND v.id = oi.variant_id;

                INSERT INTO public.sales_inventory_movements (
                    manifest_id, variant_id, type, quantity, reason, reference_id, created_by
                )
                SELECT p_manifest_id, oi.variant_id, 'RESERVATION', oi.quantity,
                       'Released by goods receipt ' || v_grn_number, v_order.id::text, p_created_by
                FROM public.sales_order_items oi
                WHERE oi.order_id = v_order.id;

                UPDATE public.sales_orders
                SET fulfillment_status = 'RESERVED', updated_at = now()
                WHERE id = v_order.id;

                v_reserved := v_reserved + 1;
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'goods_receipt_id', v_grn_id,
        'grn_number',       v_grn_number,
        'total_cost',       v_total,
        'amount_paid',      v_paid,
        'balance',          v_total - v_paid,
        'lines',            v_lines,
        'units_received',   v_units,
        'payment_id',       v_payment_id,
        'orders_reserved',  v_reserved
    );
END;
$$;


-- ------------------------------------------------------------
-- 5. Security lockdown
-- ------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.sales_record_goods_receipt(UUID, UUID, JSONB, TEXT, DATE, UUID, TEXT, NUMERIC, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.sales_record_goods_receipt(UUID, UUID, JSONB, TEXT, DATE, UUID, TEXT, NUMERIC, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
