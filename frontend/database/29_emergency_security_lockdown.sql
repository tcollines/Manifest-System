-- PHASE 0: EMERGENCY SECURITY LOCKDOWN
-- Objective: Immediately seal anonymous data wipe and extraction vulnerabilities.

BEGIN;

-- =================================================================================
-- 1. SECURE THE USERS TABLE (Stop Account Takeover & Plaintext Scrape)
-- =================================================================================
-- Remove the highly dangerous anon policies
DROP POLICY IF EXISTS "allow_anon_select" ON public.users;
DROP POLICY IF EXISTS "allow_anon_insert" ON public.users;
DROP POLICY IF EXISTS "allow_anon_update" ON public.users;
DROP POLICY IF EXISTS "allow_anon_delete" ON public.users;

-- Revoke blanket anon access
REVOKE ALL ON TABLE public.users FROM anon;

-- Note: "allow_auth_all" might still exist (FOR ALL TO authenticated USING (true)),
-- which means logged-in users can see other users. While not perfectly isolated, 
-- it prevents unauthenticated internet scrapers from dumping the table.


-- =================================================================================
-- 2. SECURE SALES & INVENTORY (Stop Financial Wipes)
-- =================================================================================
DO $$
DECLARE
    sales_tables text[] := ARRAY[
        'sales_categories', 'sales_products', 'sales_product_variants', 
        'sales_customers', 'sales_orders', 'sales_order_items', 
        'sales_payments', 'sales_receipts', 'sales_stock_taking_sessions', 
        'sales_stock_taking_items', 'sales_inventory_movements', 
        'sales_suppliers', 'sales_procurement_requests', 'sales_reservations', 
        'sales_procurement_items', 'sales_procurement_payments'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY sales_tables LOOP
        -- Check if the table actually exists before trying to modify policies
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            -- Drop the overly permissive public policy
            EXECUTE format('DROP POLICY IF EXISTS "Enable ALL for public on %s" ON public.%s', t, t);
            
            -- Replace with authenticated-only policy
            EXECUTE format('
                CREATE POLICY "Enable ALL for authenticated users on %s" 
                ON public.%s FOR ALL 
                TO authenticated 
                USING (true) WITH CHECK (true);
            ', t, t);
        END IF;
    END LOOP;
END $$;


-- =================================================================================
-- 3. SECURE MINISTRY EVENTS (Allow Public SELECT, Block Public Edit/Delete)
-- =================================================================================
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ministry_events;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.ministry_events;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.ministry_events;

-- Public can read events (for registration forms)
CREATE POLICY "Enable SELECT for public on ministry_events" 
    ON public.ministry_events FOR SELECT USING (true);

-- Only authenticated users can Update/Delete events
CREATE POLICY "Enable UPDATE for authenticated on ministry_events" 
    ON public.ministry_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable DELETE for authenticated on ministry_events" 
    ON public.ministry_events FOR DELETE TO authenticated USING (true);


-- =================================================================================
-- 4. SECURE PERSONAL VEHICLES (Stop Transport Wipes)
-- =================================================================================
DROP POLICY IF EXISTS "Enable read access for all users" ON public.personal_vehicles;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.personal_vehicles;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.personal_vehicles;

CREATE POLICY "Enable ALL for authenticated on personal_vehicles" 
    ON public.personal_vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =================================================================================
-- 5. ENSURE PUBLIC FORMS CAN STILL INSERT
-- =================================================================================
-- The forms themselves typically insert into passengers, souls, or form_responses.
-- We must ensure anon has INSERT (if not already explicitly granted), but NOT delete.
-- (Assuming passengers/souls already have proper granular policies, we are just 
-- making sure we didn't break their INSERTs. If they had "FOR ALL USING (true)", 
-- they need to be downgraded to "FOR INSERT TO anon" and "FOR ALL TO authenticated").

DO $$
BEGIN
    -- Check if 'souls' table exists and secure it just in case
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'souls') THEN
        DROP POLICY IF EXISTS "Enable ALL for public on souls" ON public.souls;
        CREATE POLICY "Enable INSERT for public on souls" ON public.souls FOR INSERT TO anon WITH CHECK (true);
        CREATE POLICY "Enable ALL for authenticated on souls" ON public.souls FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'passengers') THEN
        -- From 03_tighten_rls.sql, passengers has good authenticated policies.
        -- Let's just explicitly add an anon INSERT so public registration works.
        DROP POLICY IF EXISTS "Anon Insert Passengers" ON public.passengers;
        CREATE POLICY "Anon Insert Passengers" ON public.passengers FOR INSERT TO anon WITH CHECK (true);
    END IF;
END $$;

COMMIT;
