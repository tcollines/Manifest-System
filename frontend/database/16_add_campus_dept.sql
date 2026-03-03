-- Create Enum for Campus Category if it doesn't exist
DO $$ BEGIN
    CREATE TYPE campus_category_enum AS ENUM ('Family', 'Evangelism', 'Vacists', 'Alumni');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update Souls source_type constraint
ALTER TABLE IF EXISTS public.souls DROP CONSTRAINT IF EXISTS souls_source_type_check;
ALTER TABLE IF EXISTS public.souls ADD CONSTRAINT souls_source_type_check CHECK (source_type IN ('Service', 'Event', 'Outreach', 'Other', 'Healing Dept', 'Campus'));

-- Create Campus Activities Table
CREATE TABLE IF NOT EXISTS public.campus_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id text NOT NULL,
    category campus_category_enum NOT NULL,
    title text NOT NULL,
    date date NOT NULL,
    location text NOT NULL,
    souls_won integer DEFAULT 0,
    contacts_collected integer DEFAULT 0,
    notes text,
    created_at timestamptz DEFAULT now(),
    created_by text
);

-- Alter Souls to link to campus activities
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'souls' AND column_name = 'campus_category') THEN
        ALTER TABLE public.souls ADD COLUMN campus_category campus_category_enum;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'souls' AND column_name = 'activity_id') THEN
        ALTER TABLE public.souls ADD COLUMN activity_id uuid REFERENCES public.campus_activities(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create Campus Activity Attendants Table (specifically for Families)
CREATE TABLE IF NOT EXISTS public.campus_activity_attendants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id text NOT NULL,
    activity_id uuid REFERENCES public.campus_activities(id) ON DELETE CASCADE,
    name text NOT NULL,
    contact text,
    residence text,
    is_student boolean DEFAULT false,
    institution_name text,
    course text,
    created_at timestamptz DEFAULT now(),
    created_by text
);

-- Create Campus Finance Records
CREATE TABLE IF NOT EXISTS public.campus_finance_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id text NOT NULL,
    type text NOT NULL CHECK (type IN ('Income', 'Expense')),
    category text NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text NOT NULL,
    date date NOT NULL,
    method text NOT NULL CHECK (method IN ('Cash', 'Mobile Money', 'Bank')),
    recorded_by text,
    created_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.campus_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_activity_attendants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_finance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable ALL for authenticated users on campus_activities" ON public.campus_activities;
CREATE POLICY "Enable ALL for authenticated users on campus_activities" ON public.campus_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable ALL for authenticated users on campus_activity_attendants" ON public.campus_activity_attendants;
CREATE POLICY "Enable ALL for authenticated users on campus_activity_attendants" ON public.campus_activity_attendants FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable ALL for authenticated users on campus_finance_records" ON public.campus_finance_records;
CREATE POLICY "Enable ALL for authenticated users on campus_finance_records" ON public.campus_finance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
