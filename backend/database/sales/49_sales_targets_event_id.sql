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
