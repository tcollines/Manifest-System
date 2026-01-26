-- Add created_by column to users table to track who added the user
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by TEXT;
