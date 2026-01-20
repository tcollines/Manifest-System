-- Create Souls Table
CREATE TABLE IF NOT EXISTS souls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    gender TEXT CHECK (gender IN ('Male', 'Female')),
    residence TEXT,
    status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Visited', 'Integrated', 'Lost', 'Confirmed')), -- Funnel status
    
    -- Source Tracking
    source_type TEXT NOT NULL CHECK (source_type IN ('Service', 'Event', 'Outreach', 'Other')),
    source_id TEXT, -- ID of the Service or Event (can be UUID or string depending on other tables)
    
    -- Meta
    captured_by TEXT, -- Name or ID of the person who won/entered data
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_souls_source ON souls(source_type, source_id);
