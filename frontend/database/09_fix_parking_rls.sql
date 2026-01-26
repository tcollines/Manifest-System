-- Enable RLS for personal_vehicles table
ALTER TABLE public.personal_vehicles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Enable read access for all users" ON public.personal_vehicles;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.personal_vehicles;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.personal_vehicles;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.personal_vehicles;

-- Create PERMISSIVE policies
CREATE POLICY "Enable read access for all users" ON public.personal_vehicles FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.personal_vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.personal_vehicles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON public.personal_vehicles FOR DELETE USING (true);
