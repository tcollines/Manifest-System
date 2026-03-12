-- =============================================================================
-- Migration 86: Merge Duplicate Members & Tighten Unique Constraint
-- 
-- Problem: The unique index used (manifest_id, name_norm, phone_last9, residency_norm)
--          meaning the same person with different/empty area got two separate rows.
--
-- This migration:
--   1. Identifies all duplicate groups (same manifest + name + phone)
--   2. Merges service_attendance onto the OLDEST surviving record
--   3. Deletes duplicate member rows
--   4. Drops the old 4-column unique index
--   5. Creates a new 3-column unique index (no residency_norm)
--   6. Updates submit_member_entry RPC to match
-- =============================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- STEP 1: Identify duplicate groups and assign a canonical (survivor) record
--         We always keep the OLDEST row (min created_at).
-- -------------------------------------------------------------------------
CREATE TEMP TABLE member_dup_groups AS
SELECT
  manifest_id,
  name_norm,
  phone_last9,
  -- The survivor is the oldest record
  (ARRAY_AGG(id ORDER BY created_at ASC))[1] AS survivor_id,
  -- All IDs in this group (for cleanup)
  ARRAY_AGG(id ORDER BY created_at ASC)   AS all_ids,
  COUNT(*)                                AS dup_count
FROM public.members
WHERE name_norm IS NOT NULL
  AND phone_last9 IS NOT NULL
GROUP BY manifest_id, name_norm, phone_last9
HAVING COUNT(*) > 1;


-- -------------------------------------------------------------------------
-- STEP 2: For each survivor, merge in the best available residency from siblings
--         (prefer a non-empty value over empty)
-- -------------------------------------------------------------------------
UPDATE public.members m
SET residency = COALESCE(
  NULLIF(m.residency, ''),
  (
    SELECT NULLIF(TRIM(m2.residency), '')
    FROM public.members m2
    WHERE m2.id = ANY(g.all_ids)
      AND m2.id <> g.survivor_id
      AND NULLIF(TRIM(m2.residency), '') IS NOT NULL
    ORDER BY m2.created_at ASC
    LIMIT 1
  )
)
FROM member_dup_groups g
WHERE m.id = g.survivor_id
  AND NULLIF(TRIM(m.residency), '') IS NULL;

-- -------------------------------------------------------------------------
-- STEP 3: Migrate service_attendance rows from duplicates to survivor
--         ON CONFLICT DO NOTHING ensures we never create duplicate attendance rows.
-- -------------------------------------------------------------------------
INSERT INTO public.service_attendance (
  manifest_id, member_id, service_id, check_in_time
  -- legacy columns included only if they exist in your schema; omit if not
)
SELECT
  sa.manifest_id,
  g.survivor_id,   -- re-point to survivor
  sa.service_id,
  sa.check_in_time
FROM public.service_attendance sa
JOIN member_dup_groups g
  ON sa.member_id = ANY(g.all_ids)
  AND sa.member_id <> g.survivor_id  -- only migrate from non-survivors
ON CONFLICT (member_id, service_id) DO NOTHING;

-- -------------------------------------------------------------------------
-- STEP 4: Merge attended_service_ids array on members table itself
--         (union of all duplicate records' arrays → stored on survivor)
-- -------------------------------------------------------------------------
UPDATE public.members m
SET attended_service_ids = (
  SELECT COALESCE(
    (
      SELECT jsonb_agg(DISTINCT elem)
      FROM (
        SELECT jsonb_array_elements_text(m2.attended_service_ids) AS elem
        FROM public.members m2
        WHERE m2.id = ANY(g.all_ids)
          AND m2.attended_service_ids IS NOT NULL
      ) sub
    ),
    '[]'::jsonb
  )
)
FROM member_dup_groups g
WHERE m.id = g.survivor_id;

-- -------------------------------------------------------------------------
-- STEP 5: Delete duplicate (non-survivor) member rows
-- -------------------------------------------------------------------------
DELETE FROM public.members
WHERE id IN (
  SELECT UNNEST(all_ids) AS id
  FROM member_dup_groups
) 
AND id NOT IN (
  SELECT survivor_id FROM member_dup_groups
);

-- -------------------------------------------------------------------------
-- STEP 6: Swap unique index — drop old (4-col with residency), add new (3-col)
-- -------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_members_unique_identity;

CREATE UNIQUE INDEX idx_members_unique_identity
ON public.members(manifest_id, name_norm, phone_last9);

-- -------------------------------------------------------------------------
-- STEP 7: Update the submit_member_entry RPC
--         Remove residency from the pre-insert dedup SELECT so it agrees
--         with the new 3-column constraint.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION submit_member_entry(
  _manifest_id uuid,
  _id uuid,
  _legacy_id text,
  _name text,
  _category text,
  _phone text,
  _status text,
  _check_in_time timestamptz,
  _gender text,
  _residency text,
  _born_again boolean,
  _joined_date timestamptz,
  _attended_service_ids jsonb,
  _current_service_id uuid DEFAULT NULL,
  _legacy_current_service_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_id uuid := COALESCE(_id, gen_random_uuid());
  result record;
  action text := 'INSERT';
  match_reason text := 'NEW_RECORD';

  v_first_timer_date date := NULL;
  v_is_first_timer boolean := false;
  v_first_timer_service_id uuid := NULL;
BEGIN
  -- 0. Dedup check: match on name + phone ONLY (residency excluded).
  --    This aligns with the unique index: (manifest_id, name_norm, phone_last9).
  SELECT * INTO result FROM public.members
  WHERE manifest_id = _manifest_id
    AND name_norm    = LOWER(TRIM(REGEXP_REPLACE(_name,  '\s+', ' ', 'g')))
    AND phone_last9  = RIGHT(TRIM(_phone), 9)
  LIMIT 1;

  IF result IS NOT NULL THEN
    target_id    := result.id;
    action       := 'MERGE';
    match_reason := 'NAME_PHONE_MATCH';

    -- Update residency if the existing record has none
    IF NULLIF(TRIM(result.residency), '') IS NULL AND NULLIF(TRIM(_residency), '') IS NOT NULL THEN
      UPDATE public.members
        SET residency      = _residency,
            residency_norm = LOWER(TRIM(REGEXP_REPLACE(_residency, '\s+', ' ', 'g')))
      WHERE id = target_id;
    END IF;

    -- AUTO-UPGRADE category
    IF result.category = 'First Timer' THEN
      UPDATE public.members SET category = 'Member' WHERE id = target_id;
      result.category := 'Member';
    END IF;

    -- Refresh result after potential updates
    SELECT * INTO result FROM public.members WHERE id = target_id;

  ELSE
    -- 1. Insert new record
    IF _category = 'First Timer' THEN
      v_is_first_timer       := true;
      v_first_timer_date     := COALESCE(_check_in_time::date, NOW()::date);
      v_first_timer_service_id := _current_service_id;
    END IF;

    INSERT INTO public.members (
      manifest_id, id, legacy_id, name, category, phone, status,
      check_in_time, gender, residency, born_again, joined_date, attended_service_ids,
      is_first_timer, first_timer_date, first_timer_service_id
    )
    VALUES (
      _manifest_id, target_id, _legacy_id, _name, _category, _phone, _status,
      _check_in_time, _gender, _residency, _born_again, _joined_date, _attended_service_ids,
      v_is_first_timer, v_first_timer_date, v_first_timer_service_id
    )
    ON CONFLICT (manifest_id, name_norm, phone_last9) DO UPDATE
      SET
        -- On conflict (race condition), merge instead of failing
        category      = CASE WHEN EXCLUDED.category = 'First Timer' THEN public.members.category ELSE EXCLUDED.category END,
        check_in_time = EXCLUDED.check_in_time,
        residency     = COALESCE(NULLIF(TRIM(public.members.residency), ''), EXCLUDED.residency)
    RETURNING * INTO result;

    IF result IS NULL THEN
      -- Was merged by ON CONFLICT
      SELECT * INTO result FROM public.members
      WHERE manifest_id = _manifest_id
        AND name_norm   = LOWER(TRIM(REGEXP_REPLACE(_name, '\s+', ' ', 'g')))
        AND phone_last9 = RIGHT(TRIM(_phone), 9);
      action       := 'MERGE';
      match_reason := 'ON_CONFLICT_RECOVERED';
      target_id    := result.id;
    END IF;
  END IF;

  -- 2. Attendance sync
  IF _attended_service_ids IS NOT NULL AND jsonb_array_length(_attended_service_ids) > 0 THEN
    INSERT INTO public.service_attendance (manifest_id, member_id, legacy_member_id, service_id, legacy_service_id, check_in_time)
    SELECT
      _manifest_id,
      target_id,
      _legacy_id,
      CASE WHEN value ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
           THEN value::uuid ELSE NULL END,
      value,
      _check_in_time
    FROM jsonb_array_elements_text(_attended_service_ids)
    ON CONFLICT (member_id, service_id) DO NOTHING;
  END IF;

  RETURN to_jsonb(result) || jsonb_build_object(
    '_meta', jsonb_build_object('action', action, 'match_reason', match_reason)
  );
END;
$$;

COMMIT;
