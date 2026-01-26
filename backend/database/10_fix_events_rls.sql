-- Enable RLS for ministry_events table
ALTER TABLE public.ministry_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ministry_events;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.ministry_events;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.ministry_events;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.ministry_events;

-- Create PERMISSIVE policies
CREATE POLICY "Enable read access for all users" ON public.ministry_events FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.ministry_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.ministry_events FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON public.ministry_events FOR DELETE USING (true);
