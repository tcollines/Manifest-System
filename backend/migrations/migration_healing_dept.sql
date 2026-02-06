-- Migration: Healing Department Tables

-- 1. Create Healing Reports Table (for Outreaches)
CREATE TABLE IF NOT EXISTS healing_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    hospital_name TEXT NOT NULL,
    labourers_count INTEGER DEFAULT 0,
    souls_count INTEGER DEFAULT 0, -- Snapshot of souls won count
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT -- User ID or Name
);

-- 2. Create Healing Testimonies Table
CREATE TABLE IF NOT EXISTS healing_testimonies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES healing_reports(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    testifier_name TEXT, 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_healing_reports_date ON healing_reports(date);
CREATE INDEX IF NOT EXISTS idx_healing_testimonies_report ON healing_testimonies(report_id);

-- 4. RLS (Enable Row Level Security)
ALTER TABLE healing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE healing_testimonies ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Allow public access for now as auth is handled at app level usually, or match existing patterns)
-- Checking existing policies, usually we allow all for authenticated, or just public for this specific app context if simple.
-- SAFE DEFAULT: Allow all for authenticated.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'healing_reports' AND policyname = 'Allow all actions for authenticated users'
    ) THEN
        CREATE POLICY "Allow all actions for authenticated users" ON healing_reports
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'healing_testimonies' AND policyname = 'Allow all actions for authenticated users'
    ) THEN
        CREATE POLICY "Allow all actions for authenticated users" ON healing_testimonies
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END
$$;
