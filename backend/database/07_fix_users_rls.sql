-- Enable public access to users table for Custom Auth flow
-- WARNING: This allows any client to read/write/modify user data. 
-- In a production environment with Supabase Auth, you would use strictly defined policies based on auth.uid().
-- However, since this app manages its own 'users' table and performs auth via query, we need to open permissions or (better) define strict public policies.

-- 1. Drop existing policies if any
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable all access for public" ON public.users;

-- 2. Create permissive policies for the 'users' table
-- Allow SELECT for everyone (needed for Login to define the user)
CREATE POLICY "Enable read access for public" ON public.users
    FOR SELECT
    USING (true);

-- Allow INSERT for everyone (needed for Sign Up / Invite)
CREATE POLICY "Enable insert access for public" ON public.users
    FOR INSERT
    WITH CHECK (true);

-- Allow UPDATE for everyone (needed for Setup Account / Profile Edit)
CREATE POLICY "Enable update access for public" ON public.users
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Allow DELETE for everyone (needed for Admin deleting users)
CREATE POLICY "Enable delete access for public" ON public.users
    FOR DELETE
    USING (true);
