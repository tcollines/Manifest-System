
-- Department Slug & UUID Migration
-- Goal: Introduce semantic slugs and UUIDs to replace legacy 'd1' IDs.

BEGIN;

-- 1. Add New Columns
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid();

-- 2. Backfill Slugs (Mapping derived from Sidebar.tsx & Dump)
UPDATE public.departments SET slug = 'registration' WHERE id = 'd1';
UPDATE public.departments SET slug = 'next-gen' WHERE id = 'd2';
UPDATE public.departments SET slug = 'parking' WHERE id = 'd3';
UPDATE public.departments SET slug = 'finance' WHERE id = 'd4';
UPDATE public.departments SET slug = 'transportation' WHERE id = 'd5';
UPDATE public.departments SET slug = 'follow-up' WHERE id = 'd6';
UPDATE public.departments SET slug = 'schools' WHERE id = 'd7';
UPDATE public.departments SET slug = 'healing' WHERE id = 'd8';

-- 3. Handle any custom/unknown departments (Fallback to sanitized name)
UPDATE public.departments 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) 
WHERE slug IS NULL;

-- 4. Enforce Constraints
ALTER TABLE public.departments ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.departments ADD CONSTRAINT departments_slug_key UNIQUE (slug);
ALTER TABLE public.departments ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE public.departments ADD CONSTRAINT departments_uuid_key UNIQUE (uuid);

COMMIT;
