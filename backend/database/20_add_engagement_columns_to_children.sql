
-- Add missing columns for engagement tracking
ALTER TABLE public.children 
ADD COLUMN IF NOT EXISTS how_heard text,
ADD COLUMN IF NOT EXISTS absence_reason text;

-- Reload Supabase Schema Cache (optional but good practice)
NOTIFY pgrst, 'reload schema';
