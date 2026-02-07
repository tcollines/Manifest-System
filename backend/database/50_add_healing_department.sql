-- Add missing Healing Department
INSERT INTO public.departments (id, name) VALUES
    ('d8', 'Healing Dept')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
