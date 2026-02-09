-- 1. Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert standard departments
INSERT INTO departments (code, name) VALUES
    ('d1', 'Registration'),
    ('d2', 'Next Gen'),
    ('d3', 'Parking'),
    ('d4', 'Finance'),
    ('d5', 'Transportation'),
    ('d6', 'Follow Up'),
    ('d7', 'Schools'),
    ('d8', 'Healing'),
    ('d0', 'Administration')
ON CONFLICT (code) DO NOTHING;

-- 3. Add department_uid to users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department_uid') THEN
        ALTER TABLE users ADD COLUMN department_uid UUID REFERENCES departments(id);
    END IF;
END $$;

-- 4. Backfill users.department_uid
UPDATE users
SET department_uid = departments.id
FROM departments
WHERE users.department_id = departments.code
AND users.department_uid IS NULL;
