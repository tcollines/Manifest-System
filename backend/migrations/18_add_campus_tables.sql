-- Enum for Campus Categories
DO $$ BEGIN
    CREATE TYPE campus_category_enum AS ENUM ('Family', 'Evangelism', 'Vacists', 'Alumni');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Campus Activities Table
CREATE TABLE IF NOT EXISTS public.campus_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manifest_id UUID REFERENCES public.manifest_details(id) ON DELETE CASCADE,
    category campus_category_enum NOT NULL,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    location TEXT NOT NULL,
    souls_won INTEGER DEFAULT 0,
    contacts_collected INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT
);

-- RLS: Campus Activities
ALTER TABLE public.campus_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for authenticated users" ON public.campus_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.campus_activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.campus_activities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users" ON public.campus_activities FOR DELETE TO authenticated USING (true);

-- 2. Campus Activity Attendants Table (For detailed Family tracking etc.)
CREATE TABLE IF NOT EXISTS public.campus_activity_attendants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manifest_id UUID REFERENCES public.manifest_details(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES public.campus_activities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact TEXT,
    residence TEXT,
    is_student BOOLEAN DEFAULT true,
    institution_name TEXT,
    course TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT
);

-- RLS: Campus Attendants
ALTER TABLE public.campus_activity_attendants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for authenticated users" ON public.campus_activity_attendants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.campus_activity_attendants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.campus_activity_attendants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users" ON public.campus_activity_attendants FOR DELETE TO authenticated USING (true);

-- 3. Campus Finance Records Table
CREATE TABLE IF NOT EXISTS public.campus_finance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manifest_id UUID REFERENCES public.manifest_details(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('Income', 'Expense')) NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    method TEXT CHECK (method IN ('Cash', 'Mobile Money', 'Bank')) NOT NULL,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Campus Finance
ALTER TABLE public.campus_finance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for authenticated users" ON public.campus_finance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.campus_finance_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.campus_finance_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users" ON public.campus_finance_records FOR DELETE TO authenticated USING (true);

-- 4. Alter Souls table to include campus category and optional activity ID mapping
ALTER TABLE public.souls ADD COLUMN IF NOT EXISTS campus_category campus_category_enum;
ALTER TABLE public.souls ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES public.campus_activities(id) ON DELETE SET NULL;
