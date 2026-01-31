-- Enable pg_trgm extension for fuzzy search / trigram matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on members(name) for fast ILIKE '%token%' operations
CREATE INDEX IF NOT EXISTS idx_members_name_trgm ON members USING gin (name gin_trgm_ops);

-- Create GIN index on members(phone) for fast ILIKE '%token%' operations
CREATE INDEX IF NOT EXISTS idx_members_phone_trgm ON members USING gin (phone gin_trgm_ops);

-- Note: To make use of these indices efficiently, queries should filter using:
-- column ILIKE '%term%'
