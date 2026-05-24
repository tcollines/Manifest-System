-- ============================================================
-- Migration 24: Insert Sales Department
-- Author: Manifest System
-- Date: 2026-05-24
-- ============================================================

INSERT INTO public.departments (id, manifest_id, name, slug, description, icon, is_custom, status)
VALUES (
    'd1100000-0000-0000-0000-000000000000',
    'default_manifest',
    'Sales & Merchandise',
    'sales',
    'Church Merchandise and Fulfillment',
    'ShoppingCart',
    true,
    'Active'
) ON CONFLICT (id) DO NOTHING;
