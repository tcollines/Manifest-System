
-- Passengers Status Check
-- Goal: Determine strict types and constraints to plan migration.

WITH pk_info AS (
    SELECT data_type AS pk_type 
    FROM information_schema.columns 
    WHERE table_name = 'passengers' AND column_name = 'id'
),
fk_info AS (
    SELECT 
        ccu.table_name AS fk_target_table
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
    WHERE 
        tc.table_name = 'passengers' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND EXISTS (
            SELECT 1 FROM information_schema.key_column_usage kcu 
            WHERE kcu.constraint_name = tc.constraint_name AND kcu.column_name = 'vehicle_id'
        )
)
SELECT 
    (SELECT pk_type FROM pk_info) as passengers_id_type,
    (SELECT data_type FROM information_schema.columns WHERE table_name = 'passengers' AND column_name = 'vehicle_id') as vehicle_id_type,
    (SELECT fk_target_table FROM fk_info) as vehicle_fk_target;
