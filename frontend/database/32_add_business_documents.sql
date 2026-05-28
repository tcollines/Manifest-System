-- ========================================================================================
-- MIGRATION: 32_add_business_documents.sql
-- PURPOSE: Create a secure, tenant-isolated archive for generated business reports.
-- ========================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.sales_business_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id TEXT NOT NULL,
    document_name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    date_range TEXT NOT NULL,
    generated_by_name TEXT,
    generated_by_uid TEXT,
    format TEXT DEFAULT 'PDF',
    status TEXT DEFAULT 'GENERATED',
    report_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for fast filtering
CREATE INDEX IF NOT EXISTS idx_business_docs_manifest ON public.sales_business_documents(manifest_id);
CREATE INDEX IF NOT EXISTS idx_business_docs_type ON public.sales_business_documents(report_type);
CREATE INDEX IF NOT EXISTS idx_business_docs_status ON public.sales_business_documents(status);

-- Enable RLS
ALTER TABLE public.sales_business_documents ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Only Finance Admins within the same manifest_id can view/generate.
-- ----------------------------------------------------------------------------------------

-- Select: Finance Admins only
CREATE POLICY "Finance Select sales_business_documents" ON public.sales_business_documents 
FOR SELECT TO authenticated 
USING (manifest_id::text = public.get_auth_tenant_id() AND public.is_finance_admin());

-- Insert: Finance Admins only
CREATE POLICY "Finance Insert sales_business_documents" ON public.sales_business_documents 
FOR INSERT TO authenticated 
WITH CHECK (manifest_id::text = public.get_auth_tenant_id() AND public.is_finance_admin());

-- Update: Finance Admins only (for archiving or updating status)
CREATE POLICY "Finance Update sales_business_documents" ON public.sales_business_documents 
FOR UPDATE TO authenticated 
USING (manifest_id::text = public.get_auth_tenant_id() AND public.is_finance_admin());

-- Delete: BLOCKED (Audit trail integrity)
-- No delete policy. Reports can only be archived.

COMMIT;
