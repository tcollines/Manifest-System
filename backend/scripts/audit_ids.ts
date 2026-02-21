import { Client } from 'pg';
import * as fs from 'fs';

// Use the standard transaction pooler for SELECT queries, which is supported perfectly fine
const poolerUrl = "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl";

const client = new Client({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        // Query to find all columns ending in '_id' or 'id' and check their data type
        const query = `
            SELECT 
                c.table_name, 
                c.column_name, 
                c.data_type
            FROM 
                information_schema.columns c
            JOIN 
                information_schema.tables t ON c.table_name = t.table_name
            WHERE 
                t.table_schema = 'public' 
                AND t.table_type = 'BASE TABLE'
                AND (c.column_name = 'id' OR c.column_name LIKE '%_id' OR c.column_name LIKE '%_uid')
            ORDER BY 
                c.table_name, c.column_name;
        `;

        const { rows } = await client.query(query);

        // Also check foreign key constraints natively
        const fkQuery = `
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                c.data_type AS column_type
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
                JOIN information_schema.columns AS c
                  ON c.table_name = tc.table_name AND c.column_name = kcu.column_name AND c.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
        `;

        const { rows: fkRows } = await client.query(fkQuery);

        fs.writeFileSync('uuid_audit_columns.json', JSON.stringify(rows, null, 2));
        fs.writeFileSync('uuid_audit_fks.json', JSON.stringify(fkRows, null, 2));

        console.log("Successfully extracted schema metadata.");

    } catch (e: any) {
        console.error("ERROR:", e.message);
    } finally {
        await client.end();
    }
}

run();
