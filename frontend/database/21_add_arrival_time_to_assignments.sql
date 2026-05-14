-- 21_add_arrival_time_to_assignments.sql

-- Add arrival_time to schedule_assignments
ALTER TABLE public.schedule_assignments
    ADD COLUMN IF NOT EXISTS arrival_time TEXT;
