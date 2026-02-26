
SELECT
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON map_1 = ccu.constraint_name
      -- Note: Postgres specific join logic for ccu might differ slightly but this is standard SQL approx.
      -- Let's stick to a simpler query for Supabase/Postgres if the above is too complex.
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'ministry_events';
