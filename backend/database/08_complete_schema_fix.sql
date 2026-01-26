-- Comprehensive Fix for Users Table, Columns, and RLS
-- Run this in the Supabase SQL Editor

-- 1. Ensure 'users' table exists (basic check)
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

-- 2. Add 'invitation_token' and 'status' columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'invitation_token') THEN
        ALTER TABLE public.users ADD COLUMN invitation_token text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
        ALTER TABLE public.users ADD COLUMN status text DEFAULT 'Active';
    END IF;
END $$;

-- 3. Fix Row Level Security (RLS)
-- Modify table to enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for public" ON public.users;
DROP POLICY IF EXISTS "Enable insert access for public" ON public.users;
DROP POLICY IF EXISTS "Enable update access for public" ON public.users;
DROP POLICY IF EXISTS "Enable delete access for public" ON public.users;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable all access for public" ON public.users;

-- Create PERMISSIVE policies for Custom Auth flow (allows Client to Read/Write)
CREATE POLICY "Enable read access for public" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable insert access for public" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for public" ON public.users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for public" ON public.users FOR DELETE USING (true);

-- 4. Verify columns
COMMENT ON COLUMN public.users.invitation_token IS 'Token for user invitation links';
