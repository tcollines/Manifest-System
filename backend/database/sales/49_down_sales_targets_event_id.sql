-- ============================================================
-- 49_down_sales_targets_event_id.sql
--
-- Rolls back 49: drops the manifest-match trigger, the event unique index, the
-- presence CHECK and the event_id column on sales_targets. Migration 39's
-- calendar unique index is not touched.
--
-- WHAT THIS CANNOT RESTORE
-- ------------------------
-- Dropping the column destroys every event_id on it. Re-applying 49 gives the
-- column back empty, and there is nothing to recover it from - a target row
-- records which event it belongs to nowhere else.
--
-- This matters more than it looks: the CHECK goes with the column, so any
-- EVENT target left behind becomes a row with a period_type of 'EVENT' and no
-- event. Two of them for the same event are then indistinguishable, and the
-- calendar unique index does not cover EVENT rows, so nothing refuses the
-- duplicate. List them before rolling back if you intend to re-apply:
--
--     SELECT id, manifest_id, event_id, period_start, target_amount
--     FROM public.sales_targets
--     WHERE period_type = 'EVENT';
--
-- Keep that output. It is the only copy.
--
-- AND IT BLOCKS RE-APPLYING 49. Verified, not guessed: those orphans are rows
-- with period_type 'EVENT' and a NULL event_id, which is precisely what
-- migration 49's CHECK refuses, so re-applying 49 fails with
--
--     check constraint "sales_targets_event_id_presence_check"
--     of relation "sales_targets" is violated by some row
--
-- and applies nothing. This is the right failure - 49 will not quietly delete
-- or reclassify a target - but it has to be cleared by hand first, using the
-- output saved above: re-point each row at its event, or delete it.
--
--     DELETE FROM public.sales_targets WHERE period_type = 'EVENT';
--
-- Run that only if the targets are genuinely expendable. There is no undo.
--
-- WHAT RUNNING THIS COSTS YOU
-- ---------------------------
-- 1. EVENT targets go back to being unusable, which is the state migration 39
--    left them in: nothing says which event a target is for, and nothing stops
--    a second target for the same one.
--
-- 2. A target can once again be written against another manifest's event,
--    because the trigger that refused it is gone along with the column.
-- ============================================================

DROP TRIGGER IF EXISTS trg_sales_targets_event_same_manifest ON public.sales_targets;
DROP FUNCTION IF EXISTS public.fn_sales_targets_event_same_manifest();

DROP INDEX IF EXISTS public.uq_sales_targets_event;
DROP INDEX IF EXISTS public.idx_sales_targets_event;

ALTER TABLE public.sales_targets
    DROP CONSTRAINT IF EXISTS sales_targets_event_id_presence_check;

ALTER TABLE public.sales_targets
    DROP COLUMN IF EXISTS event_id;
