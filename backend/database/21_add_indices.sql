-- Add indices to speed up duplicate member checks
-- Name index for fast ILIKE/Search
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);

-- Phone index for fast exact matching
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);

-- Optional: Trigram index for faster ILIKE matching if pg_trgm is available
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_members_name_trgm ON members USING gin (name gin_trgm_ops);
