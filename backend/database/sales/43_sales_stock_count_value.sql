-- ============================================================
-- Migration 43: Stock Count Values & Variance Value
-- Author: Manifest System
-- Phase: 2 (Stock, Goods Receipts & Supplier Ledger)
--
-- Numbering: the plan calls this file 42. On disk 41 is the Phase 1 RPC file,
-- so Phase 2 is 42-43. See correction 1 in docs/SALES_PHASE1_HANDOFF.md.
--
-- This migration does NOT rewrite existing data. unit_cost lands as 0 on rows
-- counted before today, so their variance_value is 0 - see the note in section 1
-- before reading history off these columns.
--
-- Section 3 is a correction to the plan. The plan assigns "snapshot variant
-- cost_price into unit_cost on stock count lines" to inventory.service.ts, but
-- the insert into sales_stock_taking_items happens inside the Phase 1 RPC
-- sales_complete_stock_take, not in the service. Left alone, unit_cost would
-- stay 0 on every new line and variance_value would always be 0. The RPC is
-- therefore replaced here to take the snapshot itself.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Value on the count lines
--
-- unit_cost is the variant's cost_price AT THE MOMENT OF THE COUNT, snapshotted
-- so a later price change cannot rewrite the history of a completed count.
--
-- Rows that existed before this migration get unit_cost = 0 and therefore
-- variance_value = 0. They are not back-filled: cost_price today is not what
-- cost_price was when those counts were taken, and inventing a value would make
-- a wrong number look like a real one. Treat variance_value as meaningful only
-- for sessions completed after this migration.
-- ------------------------------------------------------------

ALTER TABLE public.sales_stock_taking_items
    ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.sales_stock_taking_items
    ADD COLUMN IF NOT EXISTS variance_value NUMERIC(15, 2)
    GENERATED ALWAYS AS (variance * unit_cost) STORED;


-- ------------------------------------------------------------
-- 2. The date the count refers to
--
-- Distinct from completed_at: a count can be physically taken on one day and
-- entered the next, and the roll-forward has to use the physical date.
-- ------------------------------------------------------------

ALTER TABLE public.sales_stock_taking_sessions
    ADD COLUMN IF NOT EXISTS count_date DATE;

-- Existing sessions get their completed date in Kampala time where they have
-- one, so the roll-forward has something to anchor to. Open sessions stay NULL.
UPDATE public.sales_stock_taking_sessions
SET count_date = (completed_at AT TIME ZONE 'Africa/Kampala')::date
WHERE count_date IS NULL AND completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_stock_sessions_manifest_date
    ON public.sales_stock_taking_sessions(manifest_id, count_date);


-- ------------------------------------------------------------
-- 3. sales_complete_stock_take, replaced to snapshot unit_cost
--
-- Identical to the migration 41 version except that it reads cost_price off the
-- locked variant row and writes it to the new unit_cost column. Everything else
-- - the reason-required rule, the adjustment movements, the session lock - is
-- unchanged.
--
-- The variant row is locked before cost_price is read so the snapshot cannot be
-- taken from a row another transaction is midway through changing. Variants are
-- locked in ascending id order, as in every other RPC.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sales_complete_stock_take(
    p_manifest_id UUID,
    p_session_id  UUID,
    p_items       JSONB,
    p_created_by  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session   RECORD;
    v_item      JSONB;
    v_variant   UUID;
    v_physical  INT;
    v_variance  INT;
    v_reason    TEXT;
    v_cost      NUMERIC;
    v_adjusted  INT := 0;
    v_value     NUMERIC := 0;
BEGIN
    SELECT * INTO v_session
    FROM public.sales_stock_taking_sessions
    WHERE id = p_session_id AND manifest_id = p_manifest_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SALES_SESSION_NOT_FOUND: %', p_session_id USING ERRCODE = 'P0002';
    END IF;

    IF v_session.status = 'COMPLETED' THEN
        RAISE EXCEPTION 'SALES_INVALID_STATE: stock take is already completed' USING ERRCODE = 'P0004';
    END IF;

    -- Lock every counted variant up front, ascending, to match the other RPCs.
    PERFORM 1
    FROM public.sales_product_variants
    WHERE id IN (
        SELECT DISTINCT (e ->> 'variant_id')::uuid FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) e
    )
    ORDER BY id
    FOR UPDATE;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
        v_variant  := (v_item ->> 'variant_id')::uuid;
        v_physical := (v_item ->> 'physical_quantity')::int;
        v_variance := COALESCE((v_item ->> 'variance')::int, 0);
        v_reason   := NULLIF(btrim(COALESCE(v_item ->> 'reason', '')), '');

        IF v_physical IS NULL OR v_physical < 0 THEN
            RAISE EXCEPTION 'SALES_INVALID_QUANTITY: physical count must be zero or more' USING ERRCODE = 'P0004';
        END IF;

        IF v_variance <> 0 AND v_reason IS NULL THEN
            RAISE EXCEPTION 'SALES_REASON_REQUIRED: a reason is required for variance % on variant %', v_variance, v_variant
                USING ERRCODE = 'P0004';
        END IF;

        SELECT cost_price INTO v_cost
        FROM public.sales_product_variants
        WHERE id = v_variant AND manifest_id = p_manifest_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'SALES_VARIANT_NOT_FOUND: %', v_variant USING ERRCODE = 'P0002';
        END IF;

        v_cost := COALESCE(v_cost, 0);

        INSERT INTO public.sales_stock_taking_items (
            session_id, variant_id, system_quantity, physical_quantity,
            variance, reason, unit_cost
        )
        VALUES (
            p_session_id, v_variant, (v_item ->> 'system_quantity')::int, v_physical,
            v_variance, v_reason, v_cost
        );

        IF v_variance <> 0 THEN
            UPDATE public.sales_product_variants
            SET stock_quantity = v_physical
            WHERE id = v_variant AND manifest_id = p_manifest_id;

            INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id)
            VALUES (p_manifest_id, v_variant, 'ADJUSTMENT', v_variance, COALESCE(v_reason, 'Stock Take'), p_session_id);

            v_adjusted := v_adjusted + 1;
            v_value    := v_value + (v_variance * v_cost);
        END IF;
    END LOOP;

    UPDATE public.sales_stock_taking_sessions
    SET status       = 'COMPLETED',
        completed_at = now(),
        count_date   = COALESCE(count_date, (now() AT TIME ZONE 'Africa/Kampala')::date)
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'session_id',        p_session_id,
        'adjusted_variants', v_adjusted,
        'variance_value',    v_value
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sales_complete_stock_take(UUID, UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.sales_complete_stock_take(UUID, UUID, JSONB, TEXT) TO service_role;
