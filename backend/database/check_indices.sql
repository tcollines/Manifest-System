
SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename = 'members'
    AND indexname IN ('idx_members_name_trgm', 'idx_members_phone_trgm');
