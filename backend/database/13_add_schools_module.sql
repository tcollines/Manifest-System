-- Create table for School Outreach Reports
CREATE TABLE IF NOT EXISTS public.school_outreach_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    centre_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    labourers JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of objects {name, contact}
    total_attendance INTEGER DEFAULT 0,
    teachers_attendance INTEGER DEFAULT 0,
    students_attendance INTEGER DEFAULT 0,
    souls_won INTEGER DEFAULT 0,
    sermon_title TEXT,
    scripture_references TEXT,
    notes TEXT,
    submitted_by TEXT REFERENCES public.users(id),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.school_outreach_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all authenticated users" ON public.school_outreach_reports
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.school_outreach_reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for creators and admins" ON public.school_outreach_reports
    FOR UPDATE USING (
        auth.uid()::text = submitted_by OR 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND (users.role IN ('Super Admin', 'Administrator', 'Head of Dept'))
        )
    );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.school_outreach_reports;
