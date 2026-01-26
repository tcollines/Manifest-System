-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Requisitions Table
CREATE TABLE public.requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requisition_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    department_id TEXT NOT NULL, -- e.g., 'd1', 'd2' or UUID if departments are in DB
    requester_id UUID NOT NULL, -- Links to users table
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Paid')),
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currrency TEXT DEFAULT 'UGX',
    notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Requisition Items Table
CREATE TABLE public.requisition_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requisition_id UUID NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RLS Policies (Optional but recommended)
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_items ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write for now (refine as needed)
CREATE POLICY "Enable all access for authenticated users" ON public.requisitions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.requisition_items
    FOR ALL USING (auth.role() = 'authenticated');
