
-- Migration: Add coordinator_uid to vehicles table (Text-based ID)
-- Description: Adds a Foreign Key to the users table to track the coordinator by ID. 
-- Changed type to TEXT to match users.id column type.

ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS coordinator_uid TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_coordinator_uid ON vehicles(coordinator_uid);

-- Comment
COMMENT ON COLUMN vehicles.coordinator_uid IS 'Link to the User ID (TEXT) of the coordinator. Used for access control enforcement.';
