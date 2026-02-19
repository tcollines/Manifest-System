
-- Department Refactor ROLLBACK
-- WARNING: This will destroy the Slug and UUID architecture for Departments.

BEGIN;

-- 1. Remove Foreign Key from Users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS fk_users_department_uid;

-- 2. Remove Shadow Column from Users
ALTER TABLE public.users DROP COLUMN IF EXISTS department_uid;

-- 3. Remove Constraints from Departments
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_slug_key;
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_uuid_key;

-- 4. Remove Columns from Departments
ALTER TABLE public.departments DROP COLUMN IF EXISTS slug;
ALTER TABLE public.departments DROP COLUMN IF EXISTS uuid;

COMMIT;
