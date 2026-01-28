
-- Fix RLS Policies for Next Gen Incidents and Training Requests

-- 1. Ensure RLS is enabled (idempotent)
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.incidents;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.training_requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.incidents;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.incidents;

-- 3. Re-create permissive policies
-- Incidents
CREATE POLICY "Allow all actions for authenticated users"
ON public.incidents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Training Requests
CREATE POLICY "Allow all actions for authenticated users"
ON public.training_requests
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Grant explicit permissions to authenticated role (safeguard)
GRANT ALL ON public.incidents TO authenticated;
GRANT ALL ON public.training_requests TO authenticated;
-- UUIDs do not use sequences, so no sequence grant needed.
-- Note: UUIDs don't use sequences, but good practice if structure changes.
