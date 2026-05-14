-- 22_add_schedule_public_slug.sql

-- Add public_slug to service_schedules
ALTER TABLE public.service_schedules
    ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE;

-- Note: In a real production migration, we might backfill existing schedules with a slug
-- e.g., UPDATE service_schedules SET public_slug = REPLACE(title, ' ', '') WHERE public_slug IS NULL;
