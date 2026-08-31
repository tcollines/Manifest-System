ALTER TABLE manifests
ADD COLUMN IF NOT EXISTS team_leader_name TEXT,
ADD COLUMN IF NOT EXISTS team_leader_email TEXT,
ADD COLUMN IF NOT EXISTS team_leader_contact TEXT;
