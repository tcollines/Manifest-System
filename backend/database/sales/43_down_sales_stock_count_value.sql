-- ============================================================
-- Rollback for Migration 43: stock count values and variance value
--
-- READ THIS BEFORE RUNNING.
--
-- Dropping unit_cost and variance_value DESTROYS the cost snapshot taken at
-- each count. It CANNOT be restored: the whole point of the column was that
-- cost_price moves, so reading today's cost_price back onto an old count line
-- would produce a different number from the one that was recorded. If those
-- valuations matter, export sales_stock_taking_items before running this.
--
-- count_date is dropped with the same caveat. It was back-filled from
-- completed_at for sessions that had one, but any count_date entered by hand -
-- a count taken on a different day from when it was keyed in - is lost.
--
-- Section 2 restores the migration 41 version of sales_complete_stock_take
-- verbatim, so the RPC keeps working against the narrowed table. That version
-- does not lock variants before reading them, which is the behaviour migration
-- 43 improved on; rolling back reinstates it.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Drop the columns
-- ------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_sales_stock_sessions_manifest_date;

ALTER TABLE public.sales_stock_taking_items  DROP COLUMN IF EXISTS variance_value;
ALTER TABLE public.sales_stock_taking_items  DROP COLUMN IF EXISTS unit_cost;
ALTER TABLE public.sales_stock_taking_sessions DROP COLUMN IF EXISTS count_date;


-- ------------------------------------------------------------
-- 2. Restore the migration 41 sales_complete_stock_take verbatim
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
    v_adjusted  INT := 0;
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

        INSERT INTO public.sales_stock_taking_items (session_id, variant_id, system_quantity, physical_quantity, variance, reason)
        VALUES (p_session_id, v_variant, (v_item ->> 'system_quantity')::int, v_physical, v_variance, v_reason);

        IF v_variance <> 0 THEN
            UPDATE public.sales_product_variants
            SET stock_quantity = v_physical
            WHERE id = v_variant AND manifest_id = p_manifest_id;

            INSERT INTO public.sales_inventory_movements (manifest_id, variant_id, type, quantity, reason, reference_id)
            VALUES (p_manifest_id, v_variant, 'ADJUSTMENT', v_variance, COALESCE(v_reason, 'Stock Take'), p_session_id);

            v_adjusted := v_adjusted + 1;
        END IF;
    END LOOP;

    UPDATE public.sales_stock_taking_sessions
    SET status = 'COMPLETED', completed_at = now()
    WHERE id = p_session_id;

    RETURN jsonb_build_object('session_id', p_session_id, 'adjusted_variants', v_adjusted);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sales_complete_stock_take(UUID, UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.sales_complete_stock_take(UUID, UUID, JSONB, TEXT) TO service_role;
