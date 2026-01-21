-- FINAL FIX for Users Table & Invitation Flow
-- Run this in Supabase SQL Editor

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS public.users (
    id text PRIMARY KEY,
    name text,
    email text,
    role text,
    department_id text,
    contact text,
    username text,
    password text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Add Missing Columns (Safe 'IF NOT EXISTS' checks)
DO $$
BEGIN
    -- Invitation & Status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'invitation_token') THEN
        ALTER TABLE public.users ADD COLUMN invitation_token text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
        ALTER TABLE public.users ADD COLUMN status text DEFAULT 'Active';
    END IF;

    -- Logistics (might cause errors if missing in code mapping)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'station_id') THEN
        ALTER TABLE public.users ADD COLUMN station_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'event_id') THEN
        ALTER TABLE public.users ADD COLUMN event_id text;
    END IF;
END $$;

-- 3. RESET RLS (Most critical step for "Not Saving" issue)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for public" ON public.users;
DROP POLICY IF EXISTS "Enable insert access for public" ON public.users;
DROP POLICY IF EXISTS "Enable update access for public" ON public.users;
DROP POLICY IF EXISTS "Enable delete access for public" ON public.users;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "allow_anon_select" ON public.users;
DROP POLICY IF EXISTS "allow_anon_insert" ON public.users;
DROP POLICY IF EXISTS "allow_anon_update" ON public.users;
DROP POLICY IF EXISTS "allow_anon_delete" ON public.users;

-- Create Permissive Policies (allowing ANON/Public access as per current auth model)
CREATE POLICY "allow_anon_select" ON public.users FOR SELECT TO anon USING (true);
CREATE POLICY "allow_anon_insert" ON public.users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "allow_anon_update" ON public.users FOR UPDATE TO anon USING (true);
CREATE POLICY "allow_anon_delete" ON public.users FOR DELETE TO anon USING (true);

-- Also allow authenticated users (just in case)
CREATE POLICY "allow_auth_all" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Grant Permissions
GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;
