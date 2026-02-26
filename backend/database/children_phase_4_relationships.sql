-- PHASE 4: READ-PATH MIGRATION & RELATIONSHIPS
-- Execute this in the Supabase SQL Editor

BEGIN;

-- 1. Ensure id_uuid is Unique (Required for FK)
ALTER TABLE public.children 
ADD CONSTRAINT UQ_children_id_uuid UNIQUE (id_uuid);

-- 2. Add Foreign Key Relationship for Incidents
ALTER TABLE public.incidents 
ADD CONSTRAINT fk_incidents_child_uuid 
FOREIGN KEY (child_id_uuid) 
REFERENCES public.children (id_uuid);

-- 3. (Optional) Index for the new FK
CREATE INDEX IF NOT EXISTS idx_incidents_child_uuid_fk 
ON public.incidents(child_id_uuid);

COMMIT;
