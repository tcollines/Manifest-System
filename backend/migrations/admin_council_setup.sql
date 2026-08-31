-- ============================================================================
-- Admin Council Setup Migration
-- Creates the admin_council_users table, seeds the initial admin user,
-- and adds a region column to manifest_details.
-- ============================================================================

-- 1. Admin Council Users table (completely separate from per-manifest users)
CREATE TABLE IF NOT EXISTS admin_council_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Admin Counsel',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Seed the initial admin council user
INSERT INTO admin_council_users (email, name, role)
VALUES ('admin@manifestms.com', 'Admin Council', 'Admin Counsel')
ON CONFLICT (email) DO NOTHING;

-- 3. Add region column to manifest_details (if not exists)
ALTER TABLE manifest_details ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'Unassigned';

-- 4. RLS: Admin council table should only be accessible via service role
ALTER TABLE admin_council_users ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service_role can access (which is what the backend uses)
