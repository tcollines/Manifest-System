-- Phase 4 Pre-Requisite: Manifest-Aware RPCs & Constraints
-- This script updates the complex INSERT RPCs and their associated Unique Constraints 
-- to respect multi-tenancy (`manifest_id`), allowing the backend to safely pass the JWT context.

BEGIN;

-- 1. Scoped Unique Constraints (Allow duplicate names across DIFFERENT manifests, but not within)

-- Drop Global Member Constraint
DROP INDEX IF EXISTS idx_members_unique_identity;
-- Create Tenant-Scoped Member Constraint
CREATE UNIQUE INDEX idx_members_unique_identity 
ON public.members(manifest_id, name_norm, phone_last9, residency_norm);

-- Drop Global Child Constraint
DROP INDEX IF EXISTS idx_children_name_contact_dedupe;
-- Create Tenant-Scoped Child Constraint
CREATE UNIQUE INDEX idx_children_name_contact_dedupe 
ON public.children (manifest_id, LOWER(TRIM(name)), REGEXP_REPLACE(parent_contact, '[^0-9]', '', 'g'));

-- 2. Update Member RPC
CREATE OR REPLACE FUNCTION submit_member_entry(
  _manifest_id uuid,      -- NEW: Tenant Context
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
  -- 0. Business Logic Deduplication IN THE CONTEXT OF THE MANIFEST
  SELECT * INTO result FROM public.members 
  WHERE manifest_id = _manifest_id -- Tenant Isolation Filter
    AND TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g')) ILIKE TRIM(REGEXP_REPLACE(_name, '\s+', ' ', 'g')) 
    AND RIGHT(TRIM(phone), 9) = RIGHT(TRIM(_phone), 9)
    AND COALESCE(TRIM(REGEXP_REPLACE(residency, '\s+', ' ', 'g')), '') ILIKE COALESCE(TRIM(REGEXP_REPLACE(_residency, '\s+', ' ', 'g')), '')
  LIMIT 1;

  IF result IS NOT NULL THEN
     target_id := result.id; 
     action := 'MERGE';
     match_reason := 'NAME_PHONE_RESIDENCY_MATCH';

     -- AUTO-UPGRADE Category
     IF result.category = 'First Timer' THEN
       UPDATE public.members SET category = 'Member' WHERE id = target_id;
       result.category := 'Member'; 
     END IF;
  ELSE
      -- 1. Insert New (Authoritative UUID graph)
      IF _category = 'First Timer' THEN
           v_is_first_timer := true;
           v_first_timer_date := COALESCE(_check_in_time::date, NOW()::date);
           v_first_timer_service_id := _current_service_id;
      ELSE
           v_is_first_timer := false;
      END IF;

      INSERT INTO public.members (
        manifest_id, -- INJECT TENANT ID
        id, legacy_id, name, category, phone, status, 
        check_in_time, gender, residency, born_again, joined_date, attended_service_ids,
        is_first_timer, first_timer_date, first_timer_service_id
      )
      VALUES (
        _manifest_id, -- TENANT VALUE
        target_id, _legacy_id, _name, _category, _phone, _status, 
        _check_in_time, _gender, _residency, _born_again, _joined_date, _attended_service_ids,
        v_is_first_timer, v_first_timer_date, v_first_timer_service_id
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING * INTO result;

      IF result IS NULL THEN
        SELECT * INTO result FROM public.members WHERE id = target_id;
        action := 'MERGE';
        match_reason := 'ID_CONFLICT_RECOVERED';
      END IF;
  END IF;

  -- 2. ATTENDANCE SYNC
  IF _attended_service_ids IS NOT NULL AND jsonb_array_length(_attended_service_ids) > 0 THEN
    INSERT INTO public.service_attendance (manifest_id, member_id, legacy_member_id, service_id, legacy_service_id, check_in_time)
    SELECT 
      _manifest_id, -- TENANT VALUE FOR ATTENDANCE
      target_id,
      _legacy_id,
      CASE WHEN value ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN value::uuid ELSE NULL END,
      value,
      _check_in_time
    FROM jsonb_array_elements_text(_attended_service_ids)
    ON CONFLICT (member_id, service_id) DO NOTHING;
  END IF;

  RETURN to_jsonb(result) || jsonb_build_object('_meta', jsonb_build_object('action', action, 'match_reason', match_reason));
END;
$$;

-- 3. Update Child RPC
CREATE OR REPLACE FUNCTION submit_child_entry(
  _manifest_id uuid,      -- NEW: Tenant Context
  _id text,
  _name text,
  _parent_name text,
  _parent_contact text,
  _age integer,
  _gender text,
  _residence text,
  _allergies text,
  _status text,
  _check_in_time timestamptz,
  _joined_date timestamptz,
  _attended_service_ids jsonb,
  _category text,
  _current_service_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  DECLARE
    target_id text; 
    result public.children%ROWTYPE;
    action text := 'INSERT';
    match_reason text := 'NEW_RECORD';
    
    v_first_timer_date date := NULL;
    v_is_first_timer boolean := false;
    v_first_timer_service_id text := NULL;
    
    v_name_norm text;
    v_contact_norm text;
  BEGIN
    IF _id IS NULL OR _id = '' THEN
        target_id := gen_random_uuid()::text;
    ELSE
        target_id := _id; 
    END IF;
   
    v_name_norm := LOWER(TRIM(_name));
    v_contact_norm := REGEXP_REPLACE(_parent_contact, '[^0-9]', '', 'g');

    IF _category = 'First Timer' THEN
         v_is_first_timer := true;
         v_first_timer_date := COALESCE(_check_in_time::date, NOW()::date);
         v_first_timer_service_id := _current_service_id;
    ELSE
         v_is_first_timer := false;
    END IF;
    
    -- Atomic Upsert with Tenant Scope
    INSERT INTO public.children (
      manifest_id, -- INJECT TENANT ID
      id, id_legacy_deprecated, name, parent_name, parent_contact, age, gender, residence, allergies,
      status, check_in_time, joined_date, attended_service_ids, category,
      is_first_timer, first_timer_date, first_timer_service_id,
      check_out_time
    )
    VALUES (
      _manifest_id, -- TENANT VALUE
      target_id::uuid, target_id, _name, _parent_name, _parent_contact, _age, _gender, _residence, _allergies,
      _status, _check_in_time, _joined_date, _attended_service_ids, _category,
      v_is_first_timer, v_first_timer_date, v_first_timer_service_id,
      NULL
    )
    ON CONFLICT (manifest_id, LOWER(TRIM(name)), REGEXP_REPLACE(parent_contact, '[^0-9]', '', 'g')) -- TENANT SCOPED CONFLICT
    DO UPDATE SET
        check_in_time = EXCLUDED.check_in_time, 
        status = EXCLUDED.status,
        check_out_time = NULL,            
        category = CASE 
            WHEN public.children.category = 'First Timer' THEN 'Member' 
            ELSE public.children.category 
        END,
        age = COALESCE(EXCLUDED.age, public.children.age),
        residence = COALESCE(EXCLUDED.residence, public.children.residence)

    RETURNING * INTO result;
    
    IF result.id::text <> target_id THEN 
         action := 'MERGE';
         match_reason := 'ON_CONFLICT_MATCH';
         target_id := result.id::text;
    END IF;

    IF _attended_service_ids IS NOT NULL THEN
        UPDATE public.children 
        SET attended_service_ids = (
            SELECT jsonb_agg(DISTINCT x) 
            FROM (
                SELECT jsonb_array_elements_text(attended_service_ids) as x FROM public.children WHERE id = target_id::uuid
                UNION
                SELECT jsonb_array_elements_text(_attended_service_ids) as x
            ) t
        )
        WHERE id = target_id::uuid;
    END IF;

    RETURN to_jsonb(result) || jsonb_build_object('_meta', jsonb_build_object('action', action, 'match_reason', match_reason));
  END;
$$;

COMMIT;
