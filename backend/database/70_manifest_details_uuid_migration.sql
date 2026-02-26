-- Phase 1: manifest_details UUID Migration (Shadow Strategy)
-- This script ensures zero downtime and safe migration of the primary key from TEXT to UUID.

-- 1. Add a new nullable UUID column
ALTER TABLE manifest_details ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- 2. Backfill existing records with a valid UUID.
-- If the existing ID is already a valid UUID text, we cast it. 
-- Otherwise, we generate a new UUID.
UPDATE manifest_details
SET id_uuid = CASE 
    WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid
    ELSE gen_random_uuid()
END
WHERE id_uuid IS NULL;

-- 3. Make the new UUID column NOT NULL now that it is backfilled
ALTER TABLE manifest_details ALTER COLUMN id_uuid SET NOT NULL;

-- 4. Switch Authority
-- First, drop the primary key constraint on the old `id` column
ALTER TABLE manifest_details DROP CONSTRAINT manifest_details_pkey CASCADE;

-- Rename the old `id` to `legacy_id`
ALTER TABLE manifest_details RENAME COLUMN id TO legacy_id;

-- Rename `id_uuid` to `id`
ALTER TABLE manifest_details RENAME COLUMN id_uuid TO id;

-- 5. Establish the new Primary Key
ALTER TABLE manifest_details ADD PRIMARY KEY (id);

-- 6. Set the default to gen_random_uuid() for future inserts
ALTER TABLE manifest_details ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 7. Add comments for clarity
COMMENT ON COLUMN manifest_details.id IS 'Primary Key - UUID generated for Multi-Tenant Isolation';
COMMENT ON COLUMN manifest_details.legacy_id IS 'Previous TEXT primary key, retained for historical tracking';
