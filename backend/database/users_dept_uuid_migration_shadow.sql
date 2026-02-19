
-- Users Department UUID Migration
-- Goal: Add department_uid shadow column and link to departments.uuid

BEGIN;

-- 1. Add Shadow Column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS department_uid UUID;

-- 2. Backfill Data
-- Join users.department_id (legacy 'd1') with departments.id ('d1') to get departments.uuid
UPDATE public.users u
SET department_uid = d.uuid
FROM public.departments d
WHERE u.department_id = d.id;

-- 3. Add Foreign Key Constraint (to ensure integrity)
-- Note: We reference departments(uuid), which must have a unique constraint (added in previous step)
ALTER TABLE public.users
ADD CONSTRAINT fk_users_department_uid
FOREIGN KEY (department_uid)
REFERENCES public.departments (uuid);

-- 4. Create Index for Performance
CREATE INDEX IF NOT EXISTS idx_users_department_uid ON public.users(department_uid);

COMMIT;
