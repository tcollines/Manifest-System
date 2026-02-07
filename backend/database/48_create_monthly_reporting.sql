-- 1. Create Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY, -- 'd1', 'd2', etc.
    name TEXT NOT NULL,
    head_id TEXT REFERENCES public.users(id), -- Pointer to the current HoD (optional helper)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Departments (based on RoleRedirect.tsx mapping)
INSERT INTO public.departments (id, name) VALUES
    ('d1', 'Registration'),
    ('d2', 'Next Gen'),
    ('d3', 'Parking'),
    ('d4', 'Finance'),
    ('d5', 'Transportation'),
    ('d6', 'Follow Up'),
    ('d7', 'Schools')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Create Monitoring Reports Table (Templates)
CREATE TABLE IF NOT EXISTS public.monitoring_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    month TEXT NOT NULL, -- "YYYY-MM"
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of field definitions
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Expired')),
    created_by TEXT REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Report Submissions Table
CREATE TABLE IF NOT EXISTS public.report_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.monitoring_reports(id) ON DELETE CASCADE,
    department_id TEXT NOT NULL REFERENCES public.departments(id),
    content JSONB NOT NULL DEFAULT '{}'::jsonb, -- The submission data
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Draft', 'Submitted')),
    submitted_by TEXT REFERENCES public.users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(report_id, department_id) -- Only one submission per department per report
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_submissions ENABLE ROW LEVEL SECURITY;

-- Simple Policies (refine as needed)
-- Everyone can read departments
CREATE POLICY "Enable read access for all users" ON public.departments USING (true);

-- Admins can do everything with reports
CREATE POLICY "Admins manage reports" ON public.monitoring_reports
    USING (auth.uid()::text IN (SELECT id FROM public.users WHERE role IN ('Super Admin', 'Administrator')))
    WITH CHECK (auth.uid()::text IN (SELECT id FROM public.users WHERE role IN ('Super Admin', 'Administrator')));

-- Everyone can read published reports (to see what exists)
CREATE POLICY "View published reports" ON public.monitoring_reports
    FOR SELECT USING (status = 'Published' OR status = 'Expired');

-- HoDs can manage their own submissions
CREATE POLICY "HoDs manage their submissions" ON public.report_submissions
    USING (
        -- User matches the department of the submission
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND users.department_id = report_submissions.department_id
        )
        OR
        -- Or user is an Admin
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND users.role IN ('Super Admin', 'Administrator', 'Team Leader')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND users.department_id = report_submissions.department_id
        )
    );
