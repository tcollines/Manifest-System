
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const query = `
SELECT 
    t.table_name, 
    c.column_name, 
    c.data_type 
FROM 
    information_schema.columns c
JOIN 
    information_schema.tables t ON c.table_name = t.table_name
WHERE 
    t.table_schema = 'public' 
    AND c.column_name = 'id'
ORDER BY 
    t.table_name;
`;

async function run() {
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: query });
    if (error) {
        // Fallback if execute_sql RPC doesn't exist (it usually requires custom setup)
        // We'll try to just inspect a few known tables manually if we cant query schema directly via RPC
        console.error("RPC Error:", error);
        console.log("Attempting direct inspection...");

        await inspectTable('users');
        await inspectTable('finance_transactions');
        await inspectTable('vehicles');
        await inspectTable('passengers');
        await inspectTable('souls');
    } else {
        console.table(data);
    }
}

async function inspectTable(table: string) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    if (error) console.error(`Error casting ${table}:`, error.message);
    else if (data && data.length > 0) {
        const id = data[0].id;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        console.log(`Table: ${table} | Sample ID: ${id} | Looks like UUID? ${isUuid}`);
    } else {
        console.log(`Table: ${table} | Empty (Cannot determine type from data)`);
    }
}

run();
