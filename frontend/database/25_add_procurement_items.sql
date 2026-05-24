-- Migration 25: Procurement Items
-- Author: Manifest System
-- Date: 2026-05-24

-- Create procurement items table
CREATE TABLE IF NOT EXISTS public.sales_procurement_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.sales_procurement_requests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.sales_product_variants(id) ON DELETE CASCADE,
    quantity_ordered INT NOT NULL DEFAULT 1,
    quantity_received INT NOT NULL DEFAULT 0,
    expected_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Update the status check constraint for procurement requests
ALTER TABLE public.sales_procurement_requests DROP CONSTRAINT IF EXISTS sales_procurement_requests_status_check;
ALTER TABLE public.sales_procurement_requests ADD CONSTRAINT sales_procurement_requests_status_check CHECK (status IN ('DRAFT', 'ORDERED', 'SUPPLIER_OUT_OF_STOCK', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'));

-- Default status for new requests
ALTER TABLE public.sales_procurement_requests ALTER COLUMN status SET DEFAULT 'DRAFT';

-- Enable RLS
ALTER TABLE public.sales_procurement_request_items ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Enable ALL for authenticated users on sales_procurement_request_items" ON public.sales_procurement_request_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
