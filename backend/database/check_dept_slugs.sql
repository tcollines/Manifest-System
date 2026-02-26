
-- Check if 'slug' column exists in departments
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'departments' AND column_name = 'slug';

-- List current departments to see standard IDs vs Slugs
SELECT id, name, code, slug FROM departments; -- code might be the old 'd1'
