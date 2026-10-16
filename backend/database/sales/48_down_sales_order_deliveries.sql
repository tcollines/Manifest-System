-- ============================================================
-- 48_down_sales_order_deliveries.sql
--
-- Rolls back 48: drops both delivery tables and sales_record_delivery, and
-- restores sales_process_checkout and sales_fulfill_order to their
-- migration-41 bodies and fn_check_sales_closed_period() to its migration-47
-- body. All three function bodies below are byte-identical to those files.
--
-- Run it in the order written. Migration 49 (event_id on sales_targets) is
-- independent of this one and does not have to come off with it.
--
-- WHAT THIS CANNOT RESTORE
-- ------------------------
-- 1. EVERY DELIVERY ROW IS DESTROYED, backfilled and real alike. Re-applying
--    48 rebuilds a delivery for each order sitting in COMPLETED, so ordinary
--    whole-order sales come back intact - but only as one delivery dated from
--    the order, never as the two or three separate handovers that actually
--    happened. Dates, methods, references and notes are gone. There is no way
--    to recover them from the order.
--
-- 2. PART-DELIVERED ORDERS LOSE THE PART. An order half handed over sits in
--    RESERVED with its delivered units already out of stock, and after this
--    rollback nothing anywhere records which units left. The stock figure
--    stays correct; what it means does not. Re-applying 48 will not bring the
--    information back, and the order will read as wholly undelivered.
--    Check for these before rolling back:
--
--        SELECT d.order_id, count(*) AS deliveries
--        FROM public.sales_order_deliveries d
--        JOIN public.sales_orders o ON o.id = d.order_id
--        WHERE o.fulfillment_status <> 'COMPLETED'
--        GROUP BY d.order_id;
--
--    Anything that query returns is unrecoverable once this file runs.
--
-- Stock, inventory movements, payments and order statuses are untouched by
-- this rollback. Nothing needs repairing there: the movement rows are the
-- record of what left the shelf, and 48 wrote them the same way 41 did.
--
-- WHAT RUNNING THIS COSTS YOU
-- ---------------------------
-- 1. Revenue recognition has to go back to completed orders. Any report
--    written against deliveries returns nothing, or zero, with no error.
--    reports.service.ts still recognises from COMPLETED orders, so if the
--    backend was never switched over, nothing there breaks.
--
-- 2. Part deliveries stop being possible at all. sales_fulfill_order goes back
--    to all-or-nothing, and any endpoint calling sales_record_delivery returns
--    a 500 from Postgres until the backend is rolled back with it.
--
-- 3. The period guard keeps its migration-47 shape and the other seven tables
--    stay guarded. Only deliveries drop out of it, along with the table.
-- ============================================================


-- ─── 1. Guard: detach from deliveries, restore the migration-47 body ────────

DROP TRIGGER IF EXISTS trg_check_closed_sales_order_deliveries ON public.sales_order_deliveries;

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


-- ─── 2. POS checkout, restored to migration 41 ──────────────────────────────

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

    RETURN jsonb_build_object(
        'order_id',          v_order_id,
        'total_amount',      v_total,
        'amount_paid',       v_paid,
        'payment_status',    v_pay_status,
        'fulfillment_status', v_fulfil
    );
END;
$$;


-- ─── 3. Fulfil an order, restored to migration 41 ───────────────────────────

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
    v_order       RECORD;
    v_item        RECORD;
    v_was_reserved BOOLEAN;
    v_rows        INT;
BEGIN
    SELECT * INTO v_order
    FROM public.sales_orders
    WHERE id = p_order_id AND manifest_id = p_manifest_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_ORDER_NOT_FOUND: %', p_order_id USING ERRCODE = 'P0002';
    END IF;

    IF v_order.payment_status <> 'PAID' THEN
        RAISE EXCEPTION 'SALES_NOT_FULLY_PAID: no item release before full payment' USING ERRCODE = 'P0004';
    END IF;

    IF v_order.fulfillment_status = 'COMPLETED' THEN
        RAISE EXCEPTION 'SALES_INVALID_STATE: order is already completed' USING ERRCODE = 'P0004';
    END IF;

    v_was_reserved := (v_order.fulfillment_status = 'RESERVED');

    PERFORM 1
    FROM public.sales_product_variants
    WHERE id IN (SELECT variant_id FROM public.sales_order_items WHERE order_id = p_order_id)
    ORDER BY id
    FOR UPDATE;

    FOR v_item IN
        SELECT variant_id, quantity FROM public.sales_order_items
        WHERE order_id = p_order_id ORDER BY variant_id
    LOOP
        IF v_was_reserved THEN
            -- The units are already reserved for this order, so availability is
            -- measured against stock alone.
            UPDATE public.sales_product_variants
            SET stock_quantity    = stock_quantity - v_item.quantity,
                reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
            WHERE id = v_item.variant_id
              AND stock_quantity >= v_item.quantity;
        ELSE
            UPDATE public.sales_product_variants
            SET stock_quantity = stock_quantity - v_item.quantity
            WHERE id = v_item.variant_id
              AND (stock_quantity - COALESCE(reserved_quantity, 0)) >= v_item.quantity;
        END IF;

        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
            RAISE EXCEPTION 'SALES_INSUFFICIENT_STOCK: cannot release % units', v_item.quantity USING ERRCODE = 'P0006';
        END IF;

        IF v_was_reserved THEN
            INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id)
            VALUES (p_manifest_id, v_item.variant_id, 'RESERVATION_RELEASE', v_item.quantity, 'Order fulfilled', p_order_id);
        END IF;

        INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id)
        VALUES (p_manifest_id, v_item.variant_id, 'SALE', v_item.quantity, 'Order completed', p_order_id);
    END LOOP;

    UPDATE public.sales_orders
    SET fulfillment_status = 'COMPLETED', updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('order_id', p_order_id, 'fulfillment_status', 'COMPLETED');
END;
$$;


-- ─── 4. Drop the delivery RPC and the tables ────────────────────────────────
--
-- Read "WHAT THIS CANNOT RESTORE" above before running these four statements.

DROP FUNCTION IF EXISTS public.sales_record_delivery(UUID, UUID, JSONB, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT);

DROP TABLE IF EXISTS public.sales_order_delivery_items;
DROP TABLE IF EXISTS public.sales_order_deliveries;
