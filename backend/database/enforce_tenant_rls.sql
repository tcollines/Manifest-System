-- =========================================================================
-- STEP 2: TENANT ISOLATION VIA ROW LEVEL SECURITY (RLS)
-- =========================================================================
-- This script dynamically identifies all tenant-bound tables (any table with a `manifest_id`),
-- enables strict Row Level Security, applies the JWT claim policy, and creates indexes.

DO $$
DECLARE
    rec RECORD;
    t_name TEXT;
    policy_name TEXT;
    index_name TEXT;
BEGIN
    -- 1. Identify all tenant-bound tables
    FOR rec IN 
        SELECT table_name::TEXT 
        FROM information_schema.columns 
        WHERE column_name = 'manifest_id' 
        AND table_schema = 'public'
    LOOP
        t_name := rec.table_name;
        policy_name := 'tenant_isolation_' || t_name;
        index_name := 'idx_' || t_name || '_manifest_id';

        RAISE NOTICE 'Locking down table: %', t_name;

        -- 2. Enable Row Level Security (Zero-Trust Enforcement)
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t_name);

        -- Clean up potential old/conflicting policies to ensure clean state
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', policy_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON %I;', t_name);
        
        -- 3. Create Strict Tenant Policy
        -- FOR ALL ensures SELECT, INSERT, UPDATE, DELETE are all covered.
        -- USING filters reads and allows valid writes/deletes.
        -- WITH CHECK blocks cross-tenant inserts or updates.
        EXECUTE format('
            CREATE POLICY %I ON %I
            FOR ALL
            USING (
                manifest_id::text = (auth.jwt() ->> ''manifest_id'')
            )
            WITH CHECK (
                manifest_id::text = (auth.jwt() ->> ''manifest_id'')
            );
        ', policy_name, t_name);

        -- 4. Ensure Proper Database Indexing for Performance
        -- The manifest_id column is now the primary access path.
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (manifest_id);', index_name, t_name);
        
    END LOOP;
    
    RAISE NOTICE 'Enterprise-Grade Tenant Isolation Enforcement Complete.';
END $$;
