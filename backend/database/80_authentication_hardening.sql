-- 1. Unique Username Index
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_not_null 
ON public.users(username) 
WHERE username IS NOT NULL;

-- 2. Foreign Key Constraint for Identity Integrity
-- DO $$ ... logic to add foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_id_fkey'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_id_fkey 
        FOREIGN KEY (id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Role Check Constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_role_check'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_role_check 
        CHECK (role IN ('Super Admin', 'Administrator', 'Coordinator', 'Logistics', 'Member', 'TeamLeader'));
    END IF;
END $$;

-- 4. Set Role to NOT NULL
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;

-- 5. RLS Helper Function for Auth
CREATE OR REPLACE FUNCTION public.has_role(required_role text) 
RETURNS boolean 
LANGUAGE sql 
STABLE 
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = required_role
  );
$$;
