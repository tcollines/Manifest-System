-- ============================================================
-- Sales Phase 3 - combined apply bundle, migrations 48 -> 49
-- Deliveries & the checkout rewrite
--
-- Paste this whole file into the Supabase SQL editor and run it ONCE.
-- The editor wraps it in a single transaction, so if any statement fails the
-- entire bundle rolls back and nothing is left half-applied.
--
-- PREREQUISITE: Phases 1 and 2 (migrations 34-47) must already be applied.
-- The bundle replaces sales_process_checkout, sales_fulfill_order and
-- fn_check_sales_closed_period, and expects migration 47's version of that
-- guard to be the one it is replacing.
--
-- THIS BUNDLE WRITES DATA. Migration 48 backfills one delivery, with lines,
-- for every order already sitting in fulfillment_status COMPLETED - 32 of them
-- on live at the time of writing. It inserts only; no existing row is changed.
-- Read the header of 48 before running it.
--
-- Rollback is 49_down first, then 48_down. Read what each one says it cannot
-- restore: 48_down destroys every delivery row, and 49_down orphans any EVENT
-- target in a way that blocks re-applying 49 until it is cleared by hand.
--
-- Verified on PostgreSQL 18.4 against a schema reconstructed from the live
-- Supabase rows, with migration 39 applied on top: 59 assertions across apply,
-- backfill, RPC runtime, the closed-period guard, rollback and re-apply. All
-- pass.
-- ============================================================


-- ############################################################
-- ## 48_sales_order_deliveries.sql
-- ############################################################

-- ============================================================
-- Migration 48: Order deliveries & the checkout rewrite
-- Author: Manifest System
-- Phase: 3 (Deliveries & Checkout) - the first plan phase written since
--        Phase 2. 44-47 were off-plan corrections, which is why Phase 3
--        starts at 48 and not at the 44 the older notes predicted.
--
-- Scope, from docs/SALES_NEXT_PLAN.md (Phase E) and correction 2 in
-- docs/SALES_PHASE1_HANDOFF.md:
--
--   1. sales_order_deliveries, which exists in no earlier migration.
--   2. sales_process_checkout REPLACED so a completed checkout writes a
--      delivery row. Not a second function - the Phase 1 one is replaced.
--   3. event_id on sales_targets -> migration 49, so the two can be rolled
--      back independently.
--
-- ─── THIS MIGRATION WRITES DATA ─────────────────────────────────────────────
--
-- Section 7 backfills one delivery, with lines, for every existing order in
-- fulfillment_status COMPLETED that has none. No existing row is modified: the
-- backfill only inserts. It exists because revenue is being moved onto
-- deliveries, and without it every historical sale would drop out of the P&L.
-- delivered_at is taken from the order's updated_at (falling back to
-- created_at), which is when the order reached COMPLETED. Backfilled rows are
-- identifiable by created_by = 'migration-48-backfill'.
--
-- Live count at the time of writing: 32 completed orders. The insert is
-- guarded by NOT EXISTS, so re-running it is a no-op.
--
-- ─── DECISIONS TAKEN HERE ───────────────────────────────────────────────────
--
-- 1. HEADER + LINES, not a header alone. A delivery carries its own item rows
--    with quantity, unit_price and unit_cost_price copied from the order line.
--    Part-collecting a preorder is therefore representable, and a
--    delivery-based P&L reads revenue and COGS off the delivery rather than
--    inferring them from the order. A header-only table would have had to be
--    migrated to this shape later, with live rows in it.
--
-- 2. REVENUE IS RECOGNISED FROM DELIVERIES once this lands. This is the
--    decision the plan says to make before fetchProfitAndLoss is written, and
--    it is now made. Revenue for a period is SUM(quantity * unit_price) over
--    sales_order_delivery_items joined to deliveries in that period; COGS is
--    the same sum over unit_cost_price. Do not recognise from
--    sales_orders.fulfillment_status = 'COMPLETED' as reports.service.ts still
--    does - that path is now the stale one.
--
-- 3. THE PICKUP PATH IS COVERED. sales_record_delivery is the one way to
--    record a handover after checkout, and sales_fulfill_order (migration 41)
--    is replaced by a thin wrapper over it so there is a single
--    implementation. completeOrder in payments.service.ts still flips the
--    order in service code and writes no delivery; switching it to this RPC is
--    a backend change, not part of this migration, and until it happens that
--    path leaves a completed order with no delivery row and no stock movement.
--
-- ─── DEVIATIONS FROM MIGRATION 41 BEHAVIOUR, AND WHY ────────────────────────
--
-- * sales_fulfill_order refused only a COMPLETED order. Delivering a CANCELLED
--   one is now refused too. Nothing in the repo calls the RPC on a cancelled
--   order - it had simply never been considered.
--
-- * 'Reserved for this order' still means fulfillment_status = 'RESERVED'
--   exactly, as in 41. READY_FOR_PICKUP is in the frontend enum but nothing
--   sets it, so it is deliberately not treated as holding a reservation.
--
-- * Movement rows keep 41's pattern: RESERVATION_RELEASE (only when the units
--   were reserved) followed by SALE. A delivery writes no movement of its own
--   beyond those two, so summing movements does not double-count.
--
-- Lock order, unchanged from the rest of the module: the order row first, then
-- the variants in ascending id order.
-- ============================================================


-- ─── 1. Deliveries ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sales_order_deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id     UUID NOT NULL,
    order_id        UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    delivered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivery_method TEXT NOT NULL DEFAULT 'COUNTER'
                    CHECK (delivery_method IN ('COUNTER', 'PICKUP', 'DISPATCH')),
    reference       TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    created_by      TEXT
);

CREATE INDEX IF NOT EXISTS idx_sales_order_deliveries_manifest_date
    ON public.sales_order_deliveries(manifest_id, delivered_at);
CREATE INDEX IF NOT EXISTS idx_sales_order_deliveries_order
    ON public.sales_order_deliveries(order_id);

ALTER TABLE public.sales_order_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_order_deliveries" ON public.sales_order_deliveries;
CREATE POLICY "Enable ALL for authenticated users on sales_order_deliveries"
    ON public.sales_order_deliveries FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable ALL for service_role on sales_order_deliveries" ON public.sales_order_deliveries;
CREATE POLICY "Enable ALL for service_role on sales_order_deliveries"
    ON public.sales_order_deliveries FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ─── 2. Delivery lines ──────────────────────────────────────────────────────
--
-- unit_price and unit_cost_price are copied from the order line at delivery
-- time, the way sales_order_items copies them from the variant at checkout.
-- A later price change must not restate a delivery that has already happened.

CREATE TABLE IF NOT EXISTS public.sales_order_delivery_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id     UUID NOT NULL,
    delivery_id     UUID NOT NULL REFERENCES public.sales_order_deliveries(id) ON DELETE CASCADE,
    order_item_id   UUID NOT NULL REFERENCES public.sales_order_items(id) ON DELETE CASCADE,
    variant_id      UUID NOT NULL REFERENCES public.sales_product_variants(id),
    quantity        INT NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    unit_cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (unit_cost_price >= 0),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_delivery_items_delivery
    ON public.sales_order_delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_sales_delivery_items_order_item
    ON public.sales_order_delivery_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_sales_delivery_items_variant
    ON public.sales_order_delivery_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_sales_delivery_items_manifest
    ON public.sales_order_delivery_items(manifest_id);

ALTER TABLE public.sales_order_delivery_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_order_delivery_items" ON public.sales_order_delivery_items;
CREATE POLICY "Enable ALL for authenticated users on sales_order_delivery_items"
    ON public.sales_order_delivery_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable ALL for service_role on sales_order_delivery_items" ON public.sales_order_delivery_items;
CREATE POLICY "Enable ALL for service_role on sales_order_delivery_items"
    ON public.sales_order_delivery_items FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ─── 3. Record a delivery ───────────────────────────────────────────────────
--
-- p_items: [{"order_item_id": uuid, "quantity": int}]
--          NULL or omitted means "everything still outstanding on the order",
--          which is the common case: a customer collecting the lot.
--
-- Full payment is still required before goods leave, exactly as
-- sales_fulfill_order required it in migration 41.
--
-- Over-delivery is refused per line against what is outstanding, so two
-- concurrent deliveries cannot between them hand over more than was ordered -
-- the order row is locked for the duration.
--
-- The order flips to COMPLETED only when every line is fully delivered. A part
-- delivery leaves the status alone, so a RESERVED order stays RESERVED with
-- the undelivered units still reserved.

CREATE OR REPLACE FUNCTION public.sales_record_delivery(
    p_manifest_id     UUID,
    p_order_id        UUID,
    p_items           JSONB       DEFAULT NULL,
    p_delivery_method TEXT        DEFAULT 'COUNTER',
    p_delivered_at    TIMESTAMPTZ DEFAULT NULL,
    p_reference       TEXT        DEFAULT NULL,
    p_notes           TEXT        DEFAULT NULL,
    p_created_by      TEXT        DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order       RECORD;
    v_line        RECORD;
    v_delivery_id UUID := gen_random_uuid();
    v_when        TIMESTAMPTZ := COALESCE(p_delivered_at, now());
    v_reserved    BOOLEAN;
    v_rows        INT;
    v_lines       INT := 0;
    v_units       INT := 0;
    v_value       NUMERIC(15, 2) := 0;
    v_complete    BOOLEAN;
BEGIN
    -- The order row first, then the variants in ascending id order. Every
    -- other stock RPC in the module takes the same two locks in this order.
    SELECT * INTO v_order
    FROM public.sales_orders
    WHERE id = p_order_id AND manifest_id = p_manifest_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_ORDER_NOT_FOUND: %', p_order_id USING ERRCODE = 'P0002';
    END IF;

    IF v_order.fulfillment_status = 'CANCELLED' THEN
        RAISE EXCEPTION 'SALES_INVALID_STATE: order is cancelled' USING ERRCODE = 'P0004';
    END IF;

    IF v_order.fulfillment_status = 'COMPLETED' THEN
        RAISE EXCEPTION 'SALES_INVALID_STATE: order is already completed' USING ERRCODE = 'P0004';
    END IF;

    IF v_order.payment_status <> 'PAID' THEN
        RAISE EXCEPTION 'SALES_NOT_FULLY_PAID: no item release before full payment' USING ERRCODE = 'P0004';
    END IF;

    v_reserved := (v_order.fulfillment_status = 'RESERVED');

    -- Checked here rather than left to the table CHECK, so the caller gets a
    -- SALES_ sentinel the API layer can map instead of a raw 23514.
    IF COALESCE(p_delivery_method, 'COUNTER') NOT IN ('COUNTER', 'PICKUP', 'DISPATCH') THEN
        RAISE EXCEPTION 'SALES_INVALID_DELIVERY_METHOD: % is not COUNTER, PICKUP or DISPATCH', p_delivery_method
            USING ERRCODE = 'P0004';
    END IF;

    IF p_items IS NOT NULL THEN
        IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
            RAISE EXCEPTION 'SALES_NO_ITEMS: a delivery needs at least one line' USING ERRCODE = 'P0004';
        END IF;

        -- An id that is not on this order would otherwise be dropped by the
        -- join below and the caller would be told a delivery succeeded.
        IF EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_items) i
            WHERE NOT EXISTS (
                SELECT 1 FROM public.sales_order_items oi
                WHERE oi.id = (i ->> 'order_item_id')::uuid
                  AND oi.order_id = p_order_id
            )
        ) THEN
            RAISE EXCEPTION 'SALES_ORDER_ITEM_NOT_FOUND: a line does not belong to order %', p_order_id
                USING ERRCODE = 'P0002';
        END IF;

        -- The same line twice would be joined twice and delivered twice.
        IF (SELECT count(*) FROM jsonb_array_elements(p_items) i)
         > (SELECT count(DISTINCT i ->> 'order_item_id') FROM jsonb_array_elements(p_items) i) THEN
            RAISE EXCEPTION 'SALES_DUPLICATE_ITEM: the same order line is listed more than once'
                USING ERRCODE = 'P0004';
        END IF;
    END IF;

    PERFORM 1
    FROM public.sales_product_variants
    WHERE id IN (SELECT variant_id FROM public.sales_order_items WHERE order_id = p_order_id)
    ORDER BY id
    FOR UPDATE;

    INSERT INTO public.sales_order_deliveries (
        id, manifest_id, order_id, delivered_at, delivery_method, reference, notes, created_by
    )
    VALUES (
        v_delivery_id, p_manifest_id, p_order_id, v_when,
        COALESCE(p_delivery_method, 'COUNTER'), p_reference, p_notes, p_created_by
    );

    FOR v_line IN
        WITH delivered AS (
            SELECT di.order_item_id, SUM(di.quantity)::int AS qty
            FROM public.sales_order_delivery_items di
            JOIN public.sales_order_deliveries d ON d.id = di.delivery_id
            WHERE d.order_id = p_order_id
              AND d.id <> v_delivery_id
            GROUP BY di.order_item_id
        ),
        requested AS (
            SELECT (i ->> 'order_item_id')::uuid AS order_item_id,
                   (i ->> 'quantity')::int       AS quantity
            FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) i
        )
        SELECT oi.id AS order_item_id,
               oi.variant_id,
               oi.unit_price,
               oi.unit_cost_price,
               (oi.quantity - COALESCE(dl.qty, 0))                       AS outstanding,
               COALESCE(r.quantity, oi.quantity - COALESCE(dl.qty, 0))   AS quantity
        FROM public.sales_order_items oi
        LEFT JOIN delivered dl ON dl.order_item_id = oi.id
        LEFT JOIN requested r  ON r.order_item_id  = oi.id
        WHERE oi.order_id = p_order_id
          AND (p_items IS NOT NULL OR (oi.quantity - COALESCE(dl.qty, 0)) > 0)
          AND (p_items IS NULL OR r.order_item_id IS NOT NULL)
        ORDER BY oi.variant_id
    LOOP
        IF v_line.quantity IS NULL OR v_line.quantity <= 0 THEN
            RAISE EXCEPTION 'SALES_INVALID_QUANTITY: quantity must be greater than zero' USING ERRCODE = 'P0004';
        END IF;

        IF v_line.quantity > v_line.outstanding THEN
            RAISE EXCEPTION 'SALES_OVER_DELIVERY: % requested, % outstanding on that line',
                v_line.quantity, v_line.outstanding USING ERRCODE = 'P0004';
        END IF;

        IF v_reserved THEN
            -- The units are already reserved for this order, so availability is
            -- measured against stock alone.
            UPDATE public.sales_product_variants
            SET stock_quantity    = stock_quantity - v_line.quantity,
                reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_line.quantity)
            WHERE id = v_line.variant_id
              AND stock_quantity >= v_line.quantity;
        ELSE
            UPDATE public.sales_product_variants
            SET stock_quantity = stock_quantity - v_line.quantity
            WHERE id = v_line.variant_id
              AND (stock_quantity - COALESCE(reserved_quantity, 0)) >= v_line.quantity;
        END IF;

        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
            RAISE EXCEPTION 'SALES_INSUFFICIENT_STOCK: cannot release % units', v_line.quantity
                USING ERRCODE = 'P0006';
        END IF;

        IF v_reserved THEN
            INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id, created_by)
            VALUES (p_manifest_id, v_line.variant_id, 'RESERVATION_RELEASE', v_line.quantity, 'Order delivered', p_order_id, p_created_by);
        END IF;

        INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id, created_by)
        VALUES (p_manifest_id, v_line.variant_id, 'SALE', v_line.quantity, 'Order delivered', p_order_id, p_created_by);

        INSERT INTO public.sales_order_delivery_items (
            manifest_id, delivery_id, order_item_id, variant_id, quantity, unit_price, unit_cost_price
        )
        VALUES (
            p_manifest_id, v_delivery_id, v_line.order_item_id, v_line.variant_id,
            v_line.quantity, v_line.unit_price, v_line.unit_cost_price
        );

        v_lines := v_lines + 1;
        v_units := v_units + v_line.quantity;
        v_value := v_value + (v_line.unit_price * v_line.quantity);
    END LOOP;

    IF v_lines = 0 THEN
        RAISE EXCEPTION 'SALES_NOTHING_OUTSTANDING: every line on order % is already delivered', p_order_id
            USING ERRCODE = 'P0004';
    END IF;

    SELECT NOT EXISTS (
        SELECT 1
        FROM public.sales_order_items oi
        LEFT JOIN (
            SELECT di.order_item_id, SUM(di.quantity)::int AS qty
            FROM public.sales_order_delivery_items di
            JOIN public.sales_order_deliveries d ON d.id = di.delivery_id
            WHERE d.order_id = p_order_id
            GROUP BY di.order_item_id
        ) dl ON dl.order_item_id = oi.id
        WHERE oi.order_id = p_order_id
          AND oi.quantity > COALESCE(dl.qty, 0)
    ) INTO v_complete;

    IF v_complete THEN
        UPDATE public.sales_orders
        SET fulfillment_status = 'COMPLETED', updated_at = now()
        WHERE id = p_order_id;
    END IF;

    RETURN jsonb_build_object(
        'delivery_id',        v_delivery_id,
        'order_id',           p_order_id,
        'delivered_at',       v_when,
        'lines',              v_lines,
        'units',              v_units,
        'delivered_value',    v_value,
        'fully_delivered',    v_complete,
        'fulfillment_status', CASE WHEN v_complete THEN 'COMPLETED' ELSE v_order.fulfillment_status END
    );
END;
$$;


-- ─── 4. Fulfil an order in full (migration 41, replaced) ────────────────────
--
-- Same signature, same preconditions, same result for the caller. The body is
-- now a call into sales_record_delivery with no item list, so the stock, the
-- movements and the delivery row all come from one implementation instead of
-- two that can drift apart.

CREATE OR REPLACE FUNCTION public.sales_fulfill_order(
    p_manifest_id UUID,
    p_order_id    UUID,
    p_created_by  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Positional, with the NULLs cast: p_items NULL is "everything still
    -- outstanding", which for an order with no deliveries yet is the lot.
    v_result := public.sales_record_delivery(
        p_manifest_id,
        p_order_id,
        NULL::jsonb,
        'COUNTER'::text,
        NULL::timestamptz,
        NULL::text,
        'Fulfilled in full'::text,
        p_created_by
    );

    RETURN jsonb_build_object(
        'order_id',           p_order_id,
        'fulfillment_status', v_result ->> 'fulfillment_status',
        'delivery_id',        v_result ->> 'delivery_id'
    );
END;
$$;


-- ─── 5. POS checkout (migration 41, replaced) ───────────────────────────────
--
-- Byte for byte the migration-41 function except for the delivery block at the
-- end: a COMPLETED checkout is a handover across the counter, so it writes a
-- delivery row with its lines. Stock and the SALE movements were already
-- written by the item loop above it - the delivery records the handover, it
-- does not move stock a second time.
--
-- A RESERVED checkout (part paid) writes no delivery. The goods have not left,
-- and the delivery follows later through sales_record_delivery.

CREATE OR REPLACE FUNCTION public.sales_process_checkout(
    p_manifest_id    UUID,
    p_items          JSONB,
    p_amount_paid    NUMERIC,
    p_account_id     UUID,
    p_payment_method TEXT,
    p_reference      TEXT  DEFAULT NULL,
    p_created_by     TEXT  DEFAULT NULL,
    p_order_payload  JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id     UUID := gen_random_uuid();
    v_delivery_id  UUID := gen_random_uuid();
    v_total        NUMERIC(15, 2) := 0;
    v_paid         NUMERIC(15, 2) := COALESCE(p_amount_paid, 0);
    v_pay_status   TEXT;
    v_fulfil       TEXT;
    v_item         JSONB;
    v_variant      RECORD;
    v_qty          INT;
    v_rows         INT;
    v_order_json   JSONB;
    v_account_ok   BOOLEAN;
BEGIN
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'SALES_NO_ITEMS: a checkout needs at least one item' USING ERRCODE = 'P0004';
    END IF;

    IF v_paid > 0 THEN
        SELECT true INTO v_account_ok
        FROM public.sales_money_accounts
        WHERE id = p_account_id AND manifest_id = p_manifest_id;

        IF NOT COALESCE(v_account_ok, false) THEN
            RAISE EXCEPTION 'SALES_ACCOUNT_NOT_FOUND: account % is not in manifest %', p_account_id, p_manifest_id
                USING ERRCODE = 'P0002';
        END IF;
    END IF;

    -- Lock every variant up front, in id order, so concurrent checkouts serialise
    -- rather than deadlock.
    PERFORM 1
    FROM public.sales_product_variants
    WHERE id IN (
        SELECT (i ->> 'variant_id')::uuid FROM jsonb_array_elements(p_items) i
    )
    ORDER BY id
    FOR UPDATE;

    -- Price the order from the server-side variant rows.
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := (v_item ->> 'quantity')::int;
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'SALES_INVALID_QUANTITY: quantity must be greater than zero' USING ERRCODE = 'P0004';
        END IF;

        SELECT id, selling_price, cost_price, stock_quantity, COALESCE(reserved_quantity, 0) AS reserved_quantity
        INTO v_variant
        FROM public.sales_product_variants
        WHERE id = (v_item ->> 'variant_id')::uuid AND manifest_id = p_manifest_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'SALES_VARIANT_NOT_FOUND: %', (v_item ->> 'variant_id') USING ERRCODE = 'P0002';
        END IF;

        IF (v_variant.stock_quantity - v_variant.reserved_quantity) < v_qty THEN
            RAISE EXCEPTION 'SALES_INSUFFICIENT_STOCK: only % available', (v_variant.stock_quantity - v_variant.reserved_quantity)
                USING ERRCODE = 'P0006';
        END IF;

        v_total := v_total + (v_variant.selling_price * v_qty);
    END LOOP;

    v_pay_status := CASE
        WHEN v_paid >= v_total THEN 'PAID'
        WHEN v_paid > 0        THEN 'PARTIAL'
        ELSE 'UNPAID'
    END;
    v_fulfil := CASE
        WHEN v_paid >= v_total THEN 'COMPLETED'
        WHEN v_paid > 0        THEN 'RESERVED'
        ELSE 'PENDING'
    END;

    -- Build the order row. Keys that do not exist as columns are ignored.
    v_order_json := COALESCE(p_order_payload, '{}'::jsonb) || jsonb_build_object(
        'id',                 v_order_id,
        'manifest_id',        p_manifest_id,
        'total_amount',       v_total,
        'amount_paid',        v_paid,
        'payment_status',     v_pay_status,
        'fulfillment_status', v_fulfil,
        'created_at',         now(),
        'updated_at',         now()
    );

    INSERT INTO public.sales_orders
    SELECT * FROM jsonb_populate_record(NULL::public.sales_orders, v_order_json);

    -- Items, stock and movements
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := (v_item ->> 'quantity')::int;

        SELECT id, selling_price, cost_price INTO v_variant
        FROM public.sales_product_variants
        WHERE id = (v_item ->> 'variant_id')::uuid;

        INSERT INTO public.sales_order_items (order_id, variant_id, quantity, unit_price, unit_cost_price)
        VALUES (v_order_id, v_variant.id, v_qty, v_variant.selling_price, v_variant.cost_price);

        IF v_fulfil = 'COMPLETED' THEN
            UPDATE public.sales_product_variants
            SET stock_quantity = stock_quantity - v_qty
            WHERE id = v_variant.id
              AND (stock_quantity - COALESCE(reserved_quantity, 0)) >= v_qty;

            GET DIAGNOSTICS v_rows = ROW_COUNT;
            IF v_rows = 0 THEN
                RAISE EXCEPTION 'SALES_INSUFFICIENT_STOCK: stock changed during checkout' USING ERRCODE = 'P0006';
            END IF;

            INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id)
            VALUES (p_manifest_id, v_variant.id, 'SALE', v_qty, 'POS completed', v_order_id);

        ELSIF v_fulfil = 'RESERVED' THEN
            UPDATE public.sales_product_variants
            SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_qty
            WHERE id = v_variant.id
              AND (stock_quantity - COALESCE(reserved_quantity, 0)) >= v_qty;

            GET DIAGNOSTICS v_rows = ROW_COUNT;
            IF v_rows = 0 THEN
                RAISE EXCEPTION 'SALES_INSUFFICIENT_STOCK: stock changed during checkout' USING ERRCODE = 'P0006';
            END IF;

            INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id)
            VALUES (p_manifest_id, v_variant.id, 'RESERVATION', v_qty, 'POS partially paid', v_order_id);
        END IF;
    END LOOP;

    -- Payment
    IF v_paid > 0 THEN
        INSERT INTO public.sales_payments (manifest_id, order_id, amount, payment_method, reference, account_id)
        VALUES (p_manifest_id, v_order_id, v_paid, p_payment_method, COALESCE(p_reference, 'POS Checkout'), p_account_id);
    END IF;

    -- Delivery. The goods go over the counter at checkout, so a COMPLETED
    -- order is delivered in full the moment it is created. This is the row the
    -- P&L recognises revenue from.
    IF v_fulfil = 'COMPLETED' THEN
        INSERT INTO public.sales_order_deliveries (
            id, manifest_id, order_id, delivered_at, delivery_method, reference, notes, created_by
        )
        VALUES (
            v_delivery_id, p_manifest_id, v_order_id, now(), 'COUNTER',
            p_reference, 'POS checkout', p_created_by
        );

        INSERT INTO public.sales_order_delivery_items (
            manifest_id, delivery_id, order_item_id, variant_id, quantity, unit_price, unit_cost_price
        )
        SELECT p_manifest_id, v_delivery_id, oi.id, oi.variant_id, oi.quantity, oi.unit_price, oi.unit_cost_price
        FROM public.sales_order_items oi
        WHERE oi.order_id = v_order_id;
    END IF;

    RETURN jsonb_build_object(
        'order_id',          v_order_id,
        'total_amount',      v_total,
        'amount_paid',       v_paid,
        'payment_status',    v_pay_status,
        'fulfillment_status', v_fulfil,
        'delivery_id',       CASE WHEN v_fulfil = 'COMPLETED' THEN v_delivery_id END
    );
END;
$$;


-- ─── 6. Security lockdown ───────────────────────────────────────────────────
--
-- CREATE OR REPLACE keeps the grants the two replaced functions already had;
-- they are restated so this file is complete on its own.

REVOKE EXECUTE ON FUNCTION public.sales_record_delivery(UUID, UUID, JSONB, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sales_fulfill_order(UUID, UUID, TEXT)                                         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sales_process_checkout(UUID, JSONB, NUMERIC, UUID, TEXT, TEXT, TEXT, JSONB)   FROM PUBLIC, anon, authenticated;

GRANT  EXECUTE ON FUNCTION public.sales_record_delivery(UUID, UUID, JSONB, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO service_role;
GRANT  EXECUTE ON FUNCTION public.sales_fulfill_order(UUID, UUID, TEXT)                                         TO service_role;
GRANT  EXECUTE ON FUNCTION public.sales_process_checkout(UUID, JSONB, NUMERIC, UUID, TEXT, TEXT, TEXT, JSONB)   TO service_role;


-- ─── 7. Backfill: a delivery for every order already completed ──────────────
--
-- Read the data warning at the top of this file before running it.
--
-- This runs BEFORE the closed-period trigger is attached in section 8, and
-- that order is deliberate. These rows reconstruct handovers that already
-- happened and are already in the reported figures; guarding them would abort
-- the whole migration the moment any month in the history had been closed,
-- which is the opposite of what the guard is for. Everything recorded after
-- this migration goes through the trigger.

WITH new_deliveries AS (
    INSERT INTO public.sales_order_deliveries (
        manifest_id, order_id, delivered_at, delivery_method, notes, created_by
    )
    SELECT o.manifest_id,
           o.id,
           COALESCE(o.updated_at, o.created_at, now()),
           'COUNTER',
           'Backfilled by migration 48 from an order already completed',
           'migration-48-backfill'
    FROM public.sales_orders o
    WHERE o.fulfillment_status = 'COMPLETED'
      AND NOT EXISTS (
          SELECT 1 FROM public.sales_order_deliveries d WHERE d.order_id = o.id
      )
    RETURNING id, order_id, manifest_id
)
INSERT INTO public.sales_order_delivery_items (
    manifest_id, delivery_id, order_item_id, variant_id, quantity, unit_price, unit_cost_price
)
SELECT nd.manifest_id, nd.id, oi.id, oi.variant_id, oi.quantity,
       COALESCE(oi.unit_price, 0), COALESCE(oi.unit_cost_price, 0)
FROM new_deliveries nd
JOIN public.sales_order_items oi ON oi.order_id = nd.order_id;


-- ─── 8. Closed-period guard on deliveries ───────────────────────────────────
--
-- A delivery is now the revenue event, so it is a dated money row and belongs
-- under the same guard as the other seven tables. The body below is migration
-- 47's - both sides of an UPDATE, every other branch byte for byte - with one
-- branch added for sales_order_deliveries.
--
-- Deleting an order cascades to its deliveries, so the guard also refuses to
-- delete an order whose delivery falls in a closed month. That is intended.

CREATE OR REPLACE FUNCTION public.fn_check_sales_closed_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_recs        JSONB[];
    v_rec         JSONB;
    v_target_date DATE;
    v_manifest_id UUID;
    v_month       DATE;
    v_is_closed   BOOLEAN;
BEGIN
    -- An UPDATE is checked against OLD and NEW. Checking only NEW would allow
    -- a row to be edited out of a closed month.
    IF (TG_OP = 'DELETE') THEN
        v_recs := ARRAY[to_jsonb(OLD)];
    ELSIF (TG_OP = 'UPDATE') THEN
        v_recs := ARRAY[to_jsonb(OLD), to_jsonb(NEW)];
    ELSE
        v_recs := ARRAY[to_jsonb(NEW)];
    END IF;

    FOREACH v_rec IN ARRAY v_recs LOOP
        v_manifest_id := (v_rec ->> 'manifest_id')::uuid;

        v_target_date := CASE TG_TABLE_NAME
            WHEN 'sales_payments'              THEN ((v_rec ->> 'created_at')::timestamptz  AT TIME ZONE 'Africa/Kampala')::date
            WHEN 'sales_refunds'               THEN ((v_rec ->> 'refunded_at')::timestamptz AT TIME ZONE 'Africa/Kampala')::date
            WHEN 'sales_procurement_payments'  THEN ((v_rec ->> 'payment_date')::timestamptz AT TIME ZONE 'Africa/Kampala')::date
            WHEN 'sales_expenses'              THEN (v_rec ->> 'expense_date')::date
            WHEN 'sales_other_transactions'    THEN (v_rec ->> 'txn_date')::date
            WHEN 'sales_fund_transfers'        THEN (v_rec ->> 'transfer_date')::date
            WHEN 'sales_goods_receipts'        THEN (v_rec ->> 'received_date')::date
            WHEN 'sales_order_deliveries'      THEN ((v_rec ->> 'delivered_at')::timestamptz AT TIME ZONE 'Africa/Kampala')::date
            WHEN 'sales_vendor_sales'          THEN ((v_rec ->> 'sold_at')::timestamptz     AT TIME ZONE 'Africa/Kampala')::date
            WHEN 'sales_vendor_settlements'    THEN ((v_rec ->> 'settled_at')::timestamptz  AT TIME ZONE 'Africa/Kampala')::date
            ELSE CURRENT_DATE
        END;

        v_target_date := COALESCE(v_target_date, CURRENT_DATE);
        v_month := date_trunc('month', v_target_date)::date;

        SELECT EXISTS (
            SELECT 1 FROM public.sales_period_closes
            WHERE manifest_id = v_manifest_id AND month = v_month
        ) INTO v_is_closed;

        IF v_is_closed THEN
            RAISE EXCEPTION 'SALES_PERIOD_CLOSED: % is closed for manifest %', to_char(v_month, 'Mon YYYY'), v_manifest_id
                USING ERRCODE = 'P0001';
        END IF;
    END LOOP;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_closed_sales_order_deliveries ON public.sales_order_deliveries;
CREATE TRIGGER trg_check_closed_sales_order_deliveries
    BEFORE INSERT OR UPDATE OR DELETE ON public.sales_order_deliveries
    FOR EACH ROW EXECUTE FUNCTION public.fn_check_sales_closed_period();

-- ############################################################
-- ## 49_sales_targets_event_id.sql
-- ############################################################

-- ============================================================
-- Migration 49: event_id on sales targets
-- Author: Manifest System
-- Phase: 3 (Deliveries & Checkout), second and last file. Independent of 48 -
--        either can be applied or rolled back without the other.
--
-- This migration does NOT rewrite existing data. It adds one nullable column,
-- one CHECK, one partial unique index and one trigger.
--
-- WHY
--
-- Migration 39 left EVENT targets unfinished on purpose. Its unique index
-- covers YEAR and MONTH only, because two events can start on the same day and
-- (manifest_id, period_type, period_start) would collide - see correction 3 in
-- docs/SALES_PHASE1_HANDOFF.md. The column those rows were meant to be
-- disambiguated by is this one.
--
-- WHAT IT ENFORCES
--
-- 1. An EVENT target must name an event, and a YEAR or MONTH target must not.
--    Both directions, in one CHECK: a MONTH row carrying an event_id would sit
--    outside the calendar unique index and outside the event one, and nothing
--    would stop a second copy of it.
--
-- 2. One target per event per manifest, as a partial unique index. Migration
--    39's calendar index is left exactly as it is.
--
-- 3. The event must belong to the same manifest as the target. A foreign key
--    cannot say this, so it is a trigger. Without it a target in one manifest
--    could name another manifest's event, and the whole point of the column is
--    to report against that event.
--
-- ministry_events is the events table - not 'events', which no longer exists.
-- Its id has been uuid since migration 55 in backend/database/, so the foreign
-- key is uuid to uuid. ON DELETE RESTRICT: deleting an event that a target is
-- measured against should fail loudly rather than quietly orphan the target.
--
-- Live state when written: three targets, all YEAR, all event_id NULL, so the
-- CHECK validates against existing rows without touching any of them.
-- ============================================================


-- ─── 1. The column ──────────────────────────────────────────────────────────

ALTER TABLE public.sales_targets
    ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.ministry_events(id) ON DELETE RESTRICT;


-- ─── 2. EVENT rows name an event; calendar rows do not ──────────────────────

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'sales_targets_event_id_presence_check'
          AND conrelid = 'public.sales_targets'::regclass
    ) THEN
        ALTER TABLE public.sales_targets
            ADD CONSTRAINT sales_targets_event_id_presence_check
            CHECK ((period_type = 'EVENT') = (event_id IS NOT NULL));
    END IF;
END;
$$;


-- ─── 3. One target per event ────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_targets_event
    ON public.sales_targets (manifest_id, event_id)
    WHERE period_type = 'EVENT';

CREATE INDEX IF NOT EXISTS idx_sales_targets_event
    ON public.sales_targets (event_id);


-- ─── 4. The event must be in the target's own manifest ──────────────────────

CREATE OR REPLACE FUNCTION public.fn_sales_targets_event_same_manifest()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.event_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.ministry_events e
        WHERE e.id = NEW.event_id
          AND e.manifest_id = NEW.manifest_id
    ) THEN
        RAISE EXCEPTION 'SALES_EVENT_NOT_FOUND: event % is not in manifest %', NEW.event_id, NEW.manifest_id
            USING ERRCODE = 'P0002';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_targets_event_same_manifest ON public.sales_targets;
CREATE TRIGGER trg_sales_targets_event_same_manifest
    BEFORE INSERT OR UPDATE ON public.sales_targets
    FOR EACH ROW EXECUTE FUNCTION public.fn_sales_targets_event_same_manifest();
