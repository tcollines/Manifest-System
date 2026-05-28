-- ========================================================================================
-- PHASE 2: ENTERPRISE RLS RECONSTRUCTION & TENANT ISOLATION HARDENING
-- Objective: Completely seal the database. Eliminate frontend trust.
-- Enforce Strict Tenant Isolation (manifest_id) on all operations.
-- ========================================================================================

BEGIN;

-- ========================================================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- These functions bypass RLS internally to lookup user metadata without triggering infinite recursion.
-- ========================================================================================

-- A. Get the Tenant ID (manifest_id) securely from the JWT app_metadata
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claim.app_metadata', true)::jsonb ->> 'manifest_id', '');
$$;

-- B. Get the User Role safely from the public.users table (bypassing RLS)
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM users WHERE id::uuid = auth.uid() LIMIT 1;
$$;

-- C. Check if user is a Global Admin (Superadmin, Admin)
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
      SELECT 1 FROM users 
      WHERE id::uuid = auth.uid() 
      AND role IN ('Superadmin', 'Admin', 'Super Admin')
  );
$$;

-- D. Check if user is Finance Admin
CREATE OR REPLACE FUNCTION public.is_finance_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
      SELECT 1 FROM users 
      WHERE id::uuid = auth.uid() 
      AND role IN ('Superadmin', 'Admin', 'Super Admin', 'Dept Finance', 'Head of Dept')
  );
$$;

-- ========================================================================================
-- 2. HARDEN USERS TABLE (No more anon/public exposure, strict tenant isolation)
-- ========================================================================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2a. SELECT: Users can only see other users in their SAME tenant.
CREATE POLICY "Users Select Policy" ON public.users
FOR SELECT TO authenticated
USING ( manifest_id::text = public.get_auth_tenant_id() );

-- 2b. INSERT: Strictly Service Role (Backend API via Supabase Auth hook). 
-- No direct frontend insertions allowed.
-- (No policy created, meaning only bypass_rls / service_role can insert)

-- 2c. UPDATE: Users can update themselves, Admins can update anyone in the tenant.
CREATE POLICY "Users Update Policy" ON public.users
FOR UPDATE TO authenticated
USING (
    manifest_id::text = public.get_auth_tenant_id()
    AND (
        id::uuid = auth.uid() OR public.is_global_admin()
    )
);

-- 2d. DELETE: Only Superadmins can delete users within their tenant.
CREATE POLICY "Users Delete Policy" ON public.users
FOR DELETE TO authenticated
USING (
    manifest_id::text = public.get_auth_tenant_id()
    AND (
        public.get_auth_user_role() IN ('Superadmin', 'Super Admin')
    )
);


-- ========================================================================================
-- 3. HARDEN CORE OPERATIONS (Events, Schedules, Workplans, Departments)
-- ========================================================================================

-- EVENTS
DO $$
DECLARE pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'ministry_events' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.ministry_events', pol.policyname);
    END LOOP;
END $$;
ALTER TABLE public.ministry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events Select" ON public.ministry_events FOR SELECT USING (manifest_id::text = public.get_auth_tenant_id());
CREATE POLICY "Events Insert" ON public.ministry_events FOR INSERT TO authenticated WITH CHECK (manifest_id::text = public.get_auth_tenant_id() AND public.is_global_admin());
CREATE POLICY "Events Update" ON public.ministry_events FOR UPDATE TO authenticated USING (manifest_id::text = public.get_auth_tenant_id() AND public.is_global_admin());
CREATE POLICY "Events Delete" ON public.ministry_events FOR DELETE TO authenticated USING (manifest_id::text = public.get_auth_tenant_id() AND public.get_auth_user_role() IN ('Superadmin', 'Super Admin'));

-- DEPARTMENTS
DO $$
DECLARE pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'departments' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.departments', pol.policyname);
    END LOOP;
END $$;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Depts Select" ON public.departments FOR SELECT USING (manifest_id::text = public.get_auth_tenant_id());
CREATE POLICY "Depts Insert" ON public.departments FOR INSERT TO authenticated WITH CHECK (manifest_id::text = public.get_auth_tenant_id() AND public.is_global_admin());
CREATE POLICY "Depts Update" ON public.departments FOR UPDATE TO authenticated USING (manifest_id::text = public.get_auth_tenant_id() AND public.is_global_admin());
CREATE POLICY "Depts Delete" ON public.departments FOR DELETE TO authenticated USING (manifest_id::text = public.get_auth_tenant_id() AND public.get_auth_user_role() IN ('Superadmin', 'Super Admin'));


-- ========================================================================================
-- 4. HARDEN HIGH-RISK FINANCE & PROCUREMENT (Sales, Receipts, Payments)
-- ========================================================================================
DO $$
DECLARE
    finance_tables text[] := ARRAY[
        'sales_payments', 'sales_receipts', 'sales_orders', 
        'sales_procurement_requests', 'sales_procurement_payments', 'dept_finances'
    ];
    t text;
    pol record;
BEGIN
    FOREACH t IN ARRAY finance_tables LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            -- Wipe old policies
            FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = t LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%s', pol.policyname, t);
            END LOOP;
            
            EXECUTE format('ALTER TABLE public.%s ENABLE ROW LEVEL SECURITY;', t);

            -- Select: Finance Admins only
            EXECUTE format('
                CREATE POLICY "Finance Select %s" ON public.%s 
                FOR SELECT TO authenticated 
                USING (manifest_id::text = public.get_auth_tenant_id() AND public.is_finance_admin());
            ', t, t);

            -- Insert: Finance Admins only
            EXECUTE format('
                CREATE POLICY "Finance Insert %s" ON public.%s 
                FOR INSERT TO authenticated 
                WITH CHECK (manifest_id::text = public.get_auth_tenant_id() AND public.is_finance_admin());
            ', t, t);

            -- Update: Finance Admins only (Strict: No updating voided/reconciled records if applicable)
            EXECUTE format('
                CREATE POLICY "Finance Update %s" ON public.%s 
                FOR UPDATE TO authenticated 
                USING (manifest_id::text = public.get_auth_tenant_id() AND public.is_finance_admin());
            ', t, t);

            -- Delete: BLOCKED entirely for financial records (Audit trail integrity)
            -- (No policy created for DELETE)
        END IF;
    END LOOP;
END $$;


-- ========================================================================================
-- 5. HARDEN TRANSPORTATION (Vehicles, Passengers)
-- Ensure cross-tenant data leakage is structurally impossible.
-- ========================================================================================
DO $$
DECLARE pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'vehicles' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.vehicles', pol.policyname);
    END LOOP;
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'passengers' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.passengers', pol.policyname);
    END LOOP;
END $$;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;

-- Vehicles
CREATE POLICY "Vehicles Select" ON public.vehicles FOR SELECT USING (manifest_id::text = public.get_auth_tenant_id());
CREATE POLICY "Vehicles Insert" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (manifest_id::text = public.get_auth_tenant_id() AND (public.is_global_admin() OR public.get_auth_user_role() IN ('Transportation Coordinator', 'Stage Coordinator')));
CREATE POLICY "Vehicles Update" ON public.vehicles FOR UPDATE TO authenticated USING (manifest_id::text = public.get_auth_tenant_id() AND (public.is_global_admin() OR public.get_auth_user_role() IN ('Transportation Coordinator', 'Stage Coordinator')));
CREATE POLICY "Vehicles Delete" ON public.vehicles FOR DELETE TO authenticated USING (manifest_id::text = public.get_auth_tenant_id() AND public.is_global_admin());

-- Passengers
CREATE POLICY "Passengers Select" ON public.passengers FOR SELECT USING (manifest_id::text = public.get_auth_tenant_id());
CREATE POLICY "Passengers Insert" ON public.passengers FOR INSERT TO authenticated WITH CHECK (manifest_id::text = public.get_auth_tenant_id());
CREATE POLICY "Passengers Update" ON public.passengers FOR UPDATE TO authenticated USING (manifest_id::text = public.get_auth_tenant_id() AND (public.is_global_admin() OR public.get_auth_user_role() IN ('Transportation Coordinator', 'Stage Coordinator')));
CREATE POLICY "Passengers Delete" ON public.passengers FOR DELETE TO authenticated USING (manifest_id::text = public.get_auth_tenant_id() AND public.is_global_admin());


COMMIT;
