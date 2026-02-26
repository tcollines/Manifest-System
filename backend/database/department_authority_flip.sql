
-- Department Authority Flip: EXECUTION
-- Goal: Swap 'd1' IDs to UUIDs in departments, users, and report_submissions tables.

BEGIN;

-- 1. PRESERVE: Create Legacy ID Column if not exists
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS legacy_id TEXT;
-- Update legacy_id only if it's null (to avoid overwriting if run multiple times)
UPDATE public.departments SET legacy_id = id WHERE legacy_id IS NULL AND id LIKE 'd%';

-- 1b. FIX: Ensure 'd0' (Administration) exists
-- The users table has 'd0' but departments table might miss it.
INSERT INTO public.departments (id, name, slug, uuid)
VALUES (
    'd0', 
    'Administration', 
    'administration', 
    gen_random_uuid() -- Generate a fresh UUID for d0
)
ON CONFLICT (id) DO NOTHING;

-- ensure d0 also has a slug/uuid if it existed but was empty (unlikely with ON CONFLICT DO NOTHING but safe to verify)
UPDATE public.departments SET slug = 'administration', uuid = gen_random_uuid() 
WHERE id = 'd0' AND (slug IS NULL OR uuid IS NULL);


-- 2. DETACH: Drop existing Foreign Keys
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS fk_users_department_id;
ALTER TABLE public.report_submissions DROP CONSTRAINT IF EXISTS report_submissions_department_id_fkey;

-- 3. MIGRATE DEPENDENTS: Update tables to point to UUIDs
-- CLEANUP: Convert empty strings to NULL
UPDATE public.users SET department_id = NULL WHERE department_id = '';
UPDATE public.report_submissions SET department_id = NULL WHERE department_id = '';

-- SMART ASSIGNMENT: Map Roles to Department UUIDs (Before Flip)
-- Administrator -> Administration (d0)
UPDATE public.users u
SET department_id = (SELECT uuid::text FROM public.departments WHERE slug = 'administration')
WHERE (department_id IS NULL) AND role = 'Administrator';

-- Member -> Members (d6)
UPDATE public.users u
SET department_id = (SELECT uuid::text FROM public.departments WHERE slug = 'members')
WHERE (department_id IS NULL) AND role = 'Member';

-- Vehicle Coordinator -> Transportation (d5)
UPDATE public.users u
SET department_id = (SELECT uuid::text FROM public.departments WHERE slug = 'transportation')
WHERE (department_id IS NULL) AND role = 'Vehicle Coordinator';

-- Users who are STILL NULL -> Default to 'Members' (Safe Fallback)
UPDATE public.users u
SET department_id = (SELECT uuid::text FROM public.departments WHERE slug = 'members')
WHERE department_id IS NULL;

-- Update Report Submissions (Mapping currect 'd1' to departments.uuid)
UPDATE public.report_submissions r
SET department_id = d.uuid::text
FROM public.departments d
WHERE r.department_id = d.id;

-- Update Users (Mapping current 'd1' to departments.uuid)
UPDATE public.users u
SET department_id = d.uuid::text
FROM public.departments d
WHERE u.department_id = d.id;

-- 4. THE FLIP: Update Departments Primary Key
-- We only update if the ID is not already a UUID (basic check for length/format)
UPDATE public.departments 
SET id = uuid::text
WHERE id LIKE 'd%';

-- 5. RE-ATTACH: Restore Integrity
-- Users
ALTER TABLE public.users 
    ADD CONSTRAINT fk_users_department_id 
    FOREIGN KEY (department_id) REFERENCES public.departments(id);

-- Report Submissions
ALTER TABLE public.report_submissions 
    ADD CONSTRAINT report_submissions_department_id_fkey 
    FOREIGN KEY (department_id) REFERENCES public.departments(id);

COMMIT;
