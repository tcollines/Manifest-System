-- Force re-application of search optimizations
-- 1. Ensure Extension exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. DROP existing indices to ensure clean slate (in case they are corrupted or invalid)
DROP INDEX IF EXISTS idx_members_name_trgm;
DROP INDEX IF EXISTS idx_members_phone_trgm;

-- 3. Re-Create GIN indices
CREATE INDEX idx_members_name_trgm ON members USING gin (name gin_trgm_ops);
CREATE INDEX idx_members_phone_trgm ON members USING gin (phone gin_trgm_ops);

-- 4. Update Statistics to ensure Query Planner uses them
ANALYZE members;
