
-- Migration: Add coordinator_uid to vehicles table
-- Description: Adds a Foreign Key to the users table to track the coordinator by ID, while preserving the existing coordinator name/contact columns for historical snapshots.

ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS coordinator_uid UUID REFERENCES users(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_coordinator_uid ON vehicles(coordinator_uid);

-- Comment
COMMENT ON COLUMN vehicles.coordinator_uid IS 'Link to the User ID of the coordinator. Used for access control enforcement.';
