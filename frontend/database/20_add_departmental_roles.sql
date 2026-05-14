-- 20_add_departmental_roles.sql

-- Create departmental_roles table
CREATE TABLE IF NOT EXISTS public.departmental_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.departmental_roles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read roles (same as departments)
CREATE POLICY "Anyone can view departmental roles" 
ON public.departmental_roles FOR SELECT USING (true);

-- Allow authenticated users to insert/update/delete roles 
-- (actual permissions will be enforced by the application layer)
CREATE POLICY "Authenticated users can insert departmental roles" 
ON public.departmental_roles FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update departmental roles" 
ON public.departmental_roles FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete departmental roles" 
ON public.departmental_roles FOR DELETE USING (auth.role() = 'authenticated');
