-- Migration 03: Tighten RLS Policies for Vehicles & Passengers
-- Purpose: Shift from broad event_id scoping to precise access via EXISTS subqueries against the users table.
-- Ensures that Stage Coordinators only see their respective station's vehicles, while System/Transpotation Admins see all tenant vehicles.

-- ==========================================
-- VEHICLES RLS REWRITE
-- ==========================================
-- Drop existing broad policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'vehicles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON vehicles', pol.policyname);
    END LOOP;
END
$$;

-- CREATE NEW POLICIES FOR VEHICLES
CREATE POLICY "Vehicles View Policy" ON public.vehicles
FOR SELECT USING (
    -- Tenant isolation first
    manifest_id = (nullif(current_setting('request.jwt.claim.app_metadata', true)::jsonb ->> 'manifest_id', ''))::uuid
    AND (
        -- Admins see all within their tenant
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::uuid = auth.uid() 
            AND users.role IN ('Superadmin', 'Admin', 'System Admin', 'Transportation Coordinator')
        )
        OR
        -- Stage Coordinator sees vehicles assigned to their station
        station_id IN (
            SELECT users.station_id::uuid FROM public.users WHERE users.id::uuid = auth.uid() AND users.station_id IS NOT NULL
        )
        OR
        -- Direct assignment fallback
        coordinator_uid::text = auth.uid()::text
    )
);

CREATE POLICY "Vehicles Update Policy" ON public.vehicles
FOR UPDATE USING (
    manifest_id = (nullif(current_setting('request.jwt.claim.app_metadata', true)::jsonb ->> 'manifest_id', ''))::uuid
    AND (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::uuid = auth.uid() 
            AND users.role IN ('Superadmin', 'Admin', 'System Admin', 'Transportation Coordinator')
        )
        OR
        station_id IN (
            SELECT users.station_id::uuid FROM public.users WHERE users.id::uuid = auth.uid() AND users.station_id IS NOT NULL
        )
        OR
        coordinator_uid::text = auth.uid()::text
    )
);

CREATE POLICY "Vehicles Insert Policy" ON public.vehicles
FOR INSERT WITH CHECK (
    manifest_id = (nullif(current_setting('request.jwt.claim.app_metadata', true)::jsonb ->> 'manifest_id', ''))::uuid
    AND (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::uuid = auth.uid() 
            AND users.role IN ('Superadmin', 'Admin', 'System Admin', 'Transportation Coordinator')
        )
        OR
        station_id IN (
            SELECT users.station_id::uuid FROM public.users WHERE users.id::uuid = auth.uid() AND users.station_id IS NOT NULL
        )
    )
);

CREATE POLICY "Vehicles Delete Policy" ON public.vehicles
FOR DELETE USING (
    manifest_id = (nullif(current_setting('request.jwt.claim.app_metadata', true)::jsonb ->> 'manifest_id', ''))::uuid
    AND (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::uuid = auth.uid() 
            AND users.role IN ('Superadmin', 'Admin', 'System Admin', 'Transportation Coordinator')
        )
    )
);

-- ==========================================
-- PASSENGERS RLS REWRITE
-- ==========================================
-- Drop existing broad policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'passengers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON passengers', pol.policyname);
    END LOOP;
END
$$;

-- CREATE NEW POLICIES FOR PASSENGERS
CREATE POLICY "Passengers View Policy" ON public.passengers
FOR SELECT USING (
    manifest_id = (nullif(current_setting('request.jwt.claim.app_metadata', true)::jsonb ->> 'manifest_id', ''))::uuid
    AND (
        -- Admins see all within their tenant
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::uuid = auth.uid() 
            AND users.role IN ('Superadmin', 'Admin', 'System Admin', 'Transportation Coordinator')
        )
        OR
        -- Users see passengers assigned to their vehicle or station
        vehicle_id IN (
            SELECT v.id FROM public.vehicles v
            WHERE v.station_id IN (SELECT users.station_id::uuid FROM public.users WHERE users.id::uuid = auth.uid()) OR v.coordinator_uid::text = auth.uid()::text
        )
        OR
        station_id IN (
            SELECT users.station_id::uuid FROM public.users WHERE users.id::uuid = auth.uid() AND users.station_id IS NOT NULL
        )
    )
);

CREATE POLICY "Passengers Update Policy" ON public.passengers
FOR UPDATE USING (
    manifest_id = (nullif(current_setting('request.jwt.claim.app_metadata', true)::jsonb ->> 'manifest_id', ''))::uuid
    AND (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::uuid = auth.uid() 
            AND users.role IN ('Superadmin', 'Admin', 'System Admin', 'Transportation Coordinator')
        )
        OR
        vehicle_id IN (
            SELECT v.id FROM public.vehicles v
            WHERE v.station_id IN (SELECT users.station_id::uuid FROM public.users WHERE users.id::uuid = auth.uid()) OR v.coordinator_uid::text = auth.uid()::text
        )
        OR
        station_id IN (
            SELECT users.station_id::uuid FROM public.users WHERE users.id::uuid = auth.uid() AND users.station_id IS NOT NULL
        )
    )
);

CREATE POLICY "Passengers Insert Policy" ON public.passengers
FOR INSERT WITH CHECK (
    manifest_id = (nullif(current_setting('request.jwt.claim.app_metadata', true)::jsonb ->> 'manifest_id', ''))::uuid
    AND (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::uuid = auth.uid() 
            AND users.role IN ('Superadmin', 'Admin', 'System Admin', 'Transportation Coordinator')
        )
        OR
        vehicle_id IN (
            SELECT v.id FROM public.vehicles v
            WHERE v.station_id IN (SELECT users.station_id::uuid FROM public.users WHERE users.id::uuid = auth.uid()) OR v.coordinator_uid::text = auth.uid()::text
        )
        OR
        station_id IN (
            SELECT users.station_id::uuid FROM public.users WHERE users.id::uuid = auth.uid() AND users.station_id IS NOT NULL
        )
    )
);

CREATE POLICY "Passengers Delete Policy" ON public.passengers
FOR DELETE USING (
    manifest_id = (nullif(current_setting('request.jwt.claim.app_metadata', true)::jsonb ->> 'manifest_id', ''))::uuid
    AND (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::uuid = auth.uid() 
            AND users.role IN ('Superadmin', 'Admin', 'System Admin', 'Transportation Coordinator')
        )
        OR
        vehicle_id IN (
            SELECT v.id FROM public.vehicles v
            WHERE v.station_id IN (SELECT users.station_id::uuid FROM public.users WHERE users.id::uuid = auth.uid()) OR v.coordinator_uid::text = auth.uid()::text
        )
    )
);
