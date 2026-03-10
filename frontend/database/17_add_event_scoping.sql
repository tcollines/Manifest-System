-- Add event_id to Schools and Campus tables for better scoping
-- Part of Event Scoping Fix - March 7

-- 1. School Outreach Reports
ALTER TABLE public.school_outreach_reports 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.ministry_events(id) ON DELETE SET NULL;

-- 2. Campus Activities
ALTER TABLE public.campus_activities 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.ministry_events(id) ON DELETE SET NULL;

-- 3. Campus Finance Records
ALTER TABLE public.campus_finance_records 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.ministry_events(id) ON DELETE SET NULL;

-- 4. Enable Realtime for existing tables (in case it was missed)
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_finance_records;

-- Indices for better performance
CREATE INDEX IF NOT EXISTS idx_school_reports_event ON public.school_outreach_reports(event_id);
CREATE INDEX IF NOT EXISTS idx_campus_activities_event ON public.campus_activities(event_id);
CREATE INDEX IF NOT EXISTS idx_campus_finance_event ON public.campus_finance_records(event_id);
