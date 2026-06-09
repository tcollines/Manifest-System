-- Migration 33: Add variant codes for flexible POS scanning
-- Date: 2026-06-09

ALTER TABLE public.sales_product_variants ADD COLUMN IF NOT EXISTS existing_qr_code TEXT UNIQUE;
ALTER TABLE public.sales_product_variants ADD COLUMN IF NOT EXISTS system_qr_code TEXT UNIQUE;
