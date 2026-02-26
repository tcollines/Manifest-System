
-- System-Wide UUID Audit
-- Lists all Tables, their Primary Keys, and Foreign Keys with Data Types.

WITH pk_info AS (
    SELECT 
        tc.table_name, 
        kcu.column_name as pk_column, 
        c.data_type as pk_type
    FROM 
        information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name 
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.columns c 
        ON kcu.table_name = c.table_name 
        AND kcu.column_name = c.column_name
        AND kcu.table_schema = c.table_schema
    WHERE 
        tc.constraint_type = 'PRIMARY KEY' 
        AND tc.table_schema = 'public'
),
fk_info AS (
    SELECT 
        tc.table_name, 
        kcu.column_name as fk_column, 
        c.data_type as fk_type,
        ccu.table_name as referenced_table,
        ccu.column_name as referenced_column
    FROM 
        information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name 
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name 
        AND ccu.table_schema = tc.table_schema
    JOIN information_schema.columns c 
        ON kcu.table_name = c.table_name 
        AND kcu.column_name = c.column_name
        AND kcu.table_schema = c.table_schema
    WHERE 
        tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
)
SELECT 
    t.table_name,
    pk.pk_column,
    pk.pk_type,
    fk.fk_column,
    fk.fk_type,
    fk.referenced_table
FROM 
    information_schema.tables t
LEFT JOIN pk_info pk ON t.table_name = pk.table_name
LEFT JOIN fk_info fk ON t.table_name = fk.table_name
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY 
    t.table_name;
