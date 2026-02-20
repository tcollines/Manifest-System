
SELECT 'manifest_details' as table_name, name || ' (' || id || ')' as manifest, count(*) 
FROM manifest_details GROUP BY id, name;

SELECT 'members' as table_name, manifest_id, count(*) 
FROM members GROUP BY manifest_id;

SELECT 'users' as table_name, manifest_id, count(*) 
FROM users GROUP BY manifest_id;

SELECT 'ministry_events' as table_name, manifest_id, count(*) 
FROM ministry_events GROUP BY manifest_id;
