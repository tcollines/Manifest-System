
-- Disable RLS Policies for Next Gen Incidents and Training Requests (Unblocking Dev)

ALTER TABLE public.incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_requests DISABLE ROW LEVEL SECURITY;

-- Ensure authenticated role has full access
GRANT ALL ON public.incidents TO authenticated;
GRANT ALL ON public.training_requests TO authenticated;
GRANT ALL ON public.incidents TO anon;
GRANT ALL ON public.training_requests TO anon;
