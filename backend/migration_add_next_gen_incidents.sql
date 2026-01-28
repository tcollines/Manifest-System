-- Migration: Add Next Gen Incidents and Training Requests

-- Incidents Table
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id TEXT REFERENCES public.children(id) ON DELETE CASCADE,
    service_id TEXT REFERENCES public.ministry_events(id), -- Linked to service
    date DATE NOT NULL,
    reported_by TEXT NOT NULL, -- User ID or Name
    type TEXT CHECK (type IN ('Behavioral', 'Medical', 'Safety', 'Other')),
    description TEXT,
    severity TEXT CHECK (severity IN ('Low', 'Medium', 'High')),
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training Requests Table
CREATE TABLE IF NOT EXISTS public.training_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_id TEXT NOT NULL REFERENCES public.users(id),
    topic TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Completed')),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_requests ENABLE ROW LEVEL SECURITY;

-- Policies (Permissive for now, simplify dev)
CREATE POLICY "Allow all actions for authenticated users" ON public.incidents
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all actions for authenticated users" ON public.training_requests
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
