-- Migration: Add Residents Module

-- 1. Create the `residences` table
CREATE TABLE IF NOT EXISTS public.residences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manifest_id UUID,
    name VARCHAR(255) NOT NULL,
    coordinator_name VARCHAR(255) NOT NULL,
    coordinator_email VARCHAR(255),
    coordinator_contact VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Create the `residence_outreach_reports` table
CREATE TABLE IF NOT EXISTS public.residence_outreach_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manifest_id UUID,
    residence_id UUID REFERENCES public.residences(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    total_attendance INTEGER DEFAULT 0,
    souls_won INTEGER DEFAULT 0,
    sermon_title VARCHAR(255),
    notes TEXT,
    submitted_by VARCHAR(255),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Enable RLS
ALTER TABLE public.residences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residence_outreach_reports ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Note: Replace or adjust these policies if your app has specific multi-tenant rules using manifest_id
CREATE POLICY "Allow authenticated full access to residences" 
    ON public.residences 
    FOR ALL 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated full access to residence reports" 
    ON public.residence_outreach_reports 
    FOR ALL 
    USING (auth.role() = 'authenticated');

-- 5. Force Realtime publication if necessary (optional)
/*
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.residences, public.residence_outreach_reports;
*/
