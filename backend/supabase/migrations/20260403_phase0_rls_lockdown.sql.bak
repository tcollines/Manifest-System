-- ============================================================
-- PHASE 0 EMERGENCY SECURITY LOCKDOWN
-- RLS Hardening Migration
-- Run via: Supabase Dashboard > SQL Editor
-- Date: 2026-04-03
-- ============================================================
-- IMPACT: This migration immediately blocks all open-table access.
-- The backend (service role) is UNAFFECTED — it bypasses RLS by design.
-- Only direct anon-key REST / Realtime access is blocked.
-- ============================================================

-- ============================================================
-- SECTION 1: USERS TABLE
-- ============================================================
-- WHY: USING(true) allowed any anon client to read/write ALL users
-- from ALL tenants without any authentication.
-- FIX: Scope reads to the authenticated user's own record only.
-- Backend login flow is via service key — unaffected.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for public"   ON public.users;
DROP POLICY IF EXISTS "Enable insert access for public" ON public.users;
DROP POLICY IF EXISTS "Enable update access for public" ON public.users;
DROP POLICY IF EXISTS "Enable delete access for public" ON public.users;
DROP POLICY IF EXISTS "Allow all"                       ON public.users;
DROP POLICY IF EXISTS "users_tenant_read"               ON public.users;

-- Users may only read their own row (matched by Supabase Auth UID)
CREATE POLICY "users_read_own"
ON public.users
FOR SELECT
USING (id = auth.uid());

-- Users may only update their own row
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- INSERT is handled by the backend (service role) — block direct client inserts
CREATE POLICY "users_no_direct_insert"
ON public.users
FOR INSERT
WITH CHECK (false);

-- DELETE is handled by the backend (service role) — block direct client deletes
CREATE POLICY "users_no_direct_delete"
ON public.users
FOR DELETE
USING (false);

-- ============================================================
-- SECTION 2: REQUISITIONS TABLE
-- ============================================================
-- WHY: USING(true) exposed all financial requests across all tenants

ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for public"           ON public.requisitions;
DROP POLICY IF EXISTS "Allow all"                              ON public.requisitions;
DROP POLICY IF EXISTS "Enable read access for authenticated"   ON public.requisitions;

-- Temporary full block via direct REST — backend (service role) bypasses this
CREATE POLICY "requisitions_block_direct_access"
ON public.requisitions
FOR ALL
USING (false)
WITH CHECK (false);

-- ============================================================
-- SECTION 3: REQUISITION ITEMS TABLE
-- ============================================================

ALTER TABLE public.requisition_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for public"   ON public.requisition_items;
DROP POLICY IF EXISTS "Allow all"                      ON public.requisition_items;

CREATE POLICY "requisition_items_block_direct_access"
ON public.requisition_items
FOR ALL
USING (false)
WITH CHECK (false);

-- ============================================================
-- SECTION 4: PERSONAL VEHICLES TABLE
-- ============================================================
-- WHY: Had open SELECT policy — any anon client could enumerate vehicles

ALTER TABLE public.personal_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users"   ON public.personal_vehicles;
DROP POLICY IF EXISTS "Allow all"                          ON public.personal_vehicles;
DROP POLICY IF EXISTS "Enable all access for public"       ON public.personal_vehicles;

CREATE POLICY "personal_vehicles_block_direct_access"
ON public.personal_vehicles
FOR ALL
USING (false)
WITH CHECK (false);

-- ============================================================
-- SECTION 5: VERIFY OTHER HIGH-VALUE TABLES HAVE RLS ENABLED
-- ============================================================
-- These tables are accessed via backend (service role) which bypasses RLS.
-- Enabling RLS ensures that if anon key is used directly, nothing leaks.

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.souls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_activity_attendants ENABLE ROW LEVEL SECURITY;

-- Drop any existing USING(true) policies on these tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (qual = 'true' OR with_check = 'true')
          AND tablename IN (
              'members','transactions','ministry_events',
              'service_attendance','souls','children',
              'campus_activities','campus_finance_records',
              'campus_activity_attendants'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
        RAISE NOTICE 'Dropped open policy: % on %', r.policyname, r.tablename;
    END LOOP;
END $$;

-- Apply block-all policy to each (backend service role bypasses — app unaffected)
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'members','transactions','ministry_events',
        'service_attendance','souls','children',
        'campus_activities','campus_finance_records',
        'campus_activity_attendants'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format(
            'CREATE POLICY "block_direct_anon_access" ON public.%I FOR ALL USING (false) WITH CHECK (false)',
            t
        );
        RAISE NOTICE 'Applied block policy to %', t;
    END LOOP;
END $$;

-- ============================================================
-- VERIFICATION QUERY
-- Run this after applying — all values should be 't' (enabled)
-- ============================================================
SELECT
    tablename,
    rowsecurity AS "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users','requisitions','requisition_items','personal_vehicles',
    'members','transactions','ministry_events','service_attendance',
    'souls','children','campus_activities','campus_finance_records'
  )
ORDER BY tablename;
