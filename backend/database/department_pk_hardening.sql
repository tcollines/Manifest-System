
-- Department PK Hardening: TEXT -> UUID
-- Goal: Convert departments.id and referencing columns to native UUID type.

BEGIN;

-- 1. Drop Dependencies (Views/Foreign Keys/Policies)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS fk_users_department_id;
ALTER TABLE public.report_submissions DROP CONSTRAINT IF EXISTS report_submissions_department_id_fkey;
ALTER TABLE public.report_submissions DROP CONSTRAINT IF EXISTS fk_reports_department_id;

-- Drop Policy Blocking Conversion
DROP POLICY IF EXISTS "HoDs manage their submissions" ON public.report_submissions;


-- 2. Convert Columns
-- Users
ALTER TABLE public.users 
    ALTER COLUMN department_id TYPE UUID USING department_id::UUID;

-- Report Submissions (Handle Nulls/Empty if any remain, though we cleaned them)
ALTER TABLE public.report_submissions 
    ALTER COLUMN department_id TYPE UUID USING department_id::UUID;

-- Departments (The Primary Key)
ALTER TABLE public.departments 
    ALTER COLUMN id TYPE UUID USING id::UUID;

-- 3. Restore Constraints
-- Users
ALTER TABLE public.users 
    ADD CONSTRAINT fk_users_department_id 
    FOREIGN KEY (department_id) REFERENCES public.departments(id);

-- Report Submissions
ALTER TABLE public.report_submissions 
    ADD CONSTRAINT fk_reports_department_id 
    FOREIGN KEY (department_id) REFERENCES public.departments(id);

-- 4. Restore Policies
-- Re-create "HoDs manage their submissions"
-- Note: Logic is identical since department_id is now UUID in both tables
CREATE POLICY "HoDs manage their submissions" ON public.report_submissions
AS PERMISSIVE FOR ALL
TO public
USING (
    (EXISTS ( 
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() 
          AND users.department_id = report_submissions.department_id
    )) 
    OR 
    (EXISTS ( 
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() 
          AND users.role = ANY (ARRAY['Super Admin'::text, 'Administrator'::text, 'Team Leader'::text])
    ))
)
WITH CHECK (
    (EXISTS ( 
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() 
          AND users.department_id = report_submissions.department_id
    ))
);

COMMIT;
