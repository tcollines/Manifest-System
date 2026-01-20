-- Since the app uses custom auth (UserStore querying 'users' table) and not Supabase Auth,
-- the DB connection is likely 'anon'. We need to allow public access for now.

-- 1. Drop existing authenticated-only policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.requisitions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.requisition_items;

-- 2. Create permissive policies (Allow All)
-- NOTE: In a production app using Supabase Auth, you would restrict this.
CREATE POLICY "Enable all access for public" ON public.requisitions
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Enable all access for public" ON public.requisition_items
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
