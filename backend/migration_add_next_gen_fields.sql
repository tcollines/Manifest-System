-- Migration: Add Next Gen fields to children table

ALTER TABLE public.children 
ADD COLUMN IF NOT EXISTS follow_up_status TEXT CHECK (follow_up_status IN ('Pending', 'Called', 'Message Sent', 'Visited')),
ADD COLUMN IF NOT EXISTS assigned_to TEXT, -- Storing name or ID
ADD COLUMN IF NOT EXISTS salvation_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS care_notes JSONB DEFAULT '[]'::jsonb;

-- Optional: Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_children_follow_up ON public.children(follow_up_status);
CREATE INDEX IF NOT EXISTS idx_children_category ON public.children(category);

-- Create Volunteer Attendance Table
CREATE TABLE IF NOT EXISTS volunteer_attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    volunteer_id TEXT NOT NULL REFERENCES users(id),
    service_id TEXT NOT NULL REFERENCES ministry_events(id),
    date DATE NOT NULL,
    role TEXT,
    status TEXT CHECK (status IN ('Present', 'Late', 'Absent')),
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(volunteer_id, service_id)
);

-- Enable RLS
ALTER TABLE volunteer_attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts/duplicates
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON volunteer_attendance;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON volunteer_attendance;
DROP POLICY IF EXISTS "Enable access to all users" ON volunteer_attendance;

-- Create policy to allow all actions for authenticated users
CREATE POLICY "Allow all actions for authenticated users" ON volunteer_attendance
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
