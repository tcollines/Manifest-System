-- Migration 25: Deduplicate existing duplicate passengers and enforce unique constraint

-- 1. Deduplicate passengers for the same vehicle having identical name and contact
DELETE FROM public.passengers p1
USING public.passengers p2
WHERE p1.vehicle_id = p2.vehicle_id
  AND p1.vehicle_id IS NOT NULL
  AND LOWER(TRIM(p1.name)) = LOWER(TRIM(p2.name))
  AND TRIM(COALESCE(p1.contact, '')) = TRIM(COALESCE(p2.contact, ''))
  AND p1.created_at > p2.created_at;

-- 2. Create unique index to enforce single entry per vehicle, name, and contact
CREATE UNIQUE INDEX IF NOT EXISTS passengers_vehicle_name_contact_unique 
ON public.passengers (vehicle_id, LOWER(TRIM(name)), TRIM(COALESCE(contact, '')))
WHERE vehicle_id IS NOT NULL AND status IS DISTINCT FROM 'Deleted';
