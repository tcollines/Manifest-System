-- Create table for storing payment installments
CREATE TABLE IF NOT EXISTS requisition_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requisition_id UUID REFERENCES requisitions(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    method TEXT NOT NULL, -- 'Cash', 'Mobile Money', etc.
    transaction_id TEXT, -- For Mobile Money
    recorded_by TEXT, -- User ID or Name of finance officer
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Add amount_paid and paid_status to requisitions table for easier querying
ALTER TABLE requisitions 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15, 2) DEFAULT 0;

-- Optional: Add index for performance
CREATE INDEX IF NOT EXISTS idx_requisition_payments_req_id ON requisition_payments(requisition_id);
