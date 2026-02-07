-- Drop the existing constraint
ALTER TABLE souls DROP CONSTRAINT IF EXISTS souls_source_type_check;

-- Add the new constraint including 'Healing Dept'
ALTER TABLE souls ADD CONSTRAINT souls_source_type_check CHECK (source_type IN ('Service', 'Event', 'Outreach', 'Other', 'Healing Dept'));

-- Migrate existing Healing Outreach records
UPDATE souls
SET source_type = 'Healing Dept'
WHERE source_type = 'Outreach' AND notes LIKE 'Healing Outreach:%';
