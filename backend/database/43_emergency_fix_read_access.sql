-- EMERGENCY FIX: Restore Read Access
-- Run this if frontend shows "Failed to load" or empty lists despite data existing.

-- 1. MEMBERS Table
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.members;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.members;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.members;

CREATE POLICY "Enable read access for authenticated users" 
ON public.members FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable read access for anon" 
ON public.members FOR SELECT 
TO anon 
USING (true);

-- 2. MINISTRY_EVENTS Table
ALTER TABLE public.ministry_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.ministry_events;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.ministry_events;

CREATE POLICY "Enable read access for authenticated users" 
ON public.ministry_events FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable read access for anon" 
ON public.ministry_events FOR SELECT 
TO anon 
USING (true);


-- 3. USERS Table (Just in case)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Ensure users can read their own data or all data depending on role
-- For now, open read to ensure dashboard loads
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
CREATE POLICY "Enable read access for all users" 
ON public.users FOR SELECT 
USING (true);
