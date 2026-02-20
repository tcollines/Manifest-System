-- Enable the pg_trgm extension for fast wildcard (ilike '%...%') string searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes using trigram operator classes for the name and phone columns
CREATE INDEX IF NOT EXISTS idx_members_name_trgm ON members USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_members_phone_trgm ON members USING GIN (phone gin_trgm_ops);
