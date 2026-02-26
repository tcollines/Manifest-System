const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const query = `
            SELECT table_name 
            FROM information_schema.columns 
            WHERE column_name = 'manifest_id' 
            AND table_schema = 'public';
        `;
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });

        if (error) {
            console.error("RPC exec_sql failed:", error.message);
            process.exit(1);
        }

        console.log("Tenant tables:", data);

        const indexQuery = `
            SELECT
                i.relname as index_name,
                a.attname as column_name,
                t.relname as table_name
            FROM
                pg_class t,
                pg_class i,
                pg_index ix,
                pg_attribute a
            WHERE
                t.oid = ix.indrelid
                and i.oid = ix.indexrelid
                and a.attrelid = t.oid
                and a.attnum = ANY(ix.indkey)
                and t.relkind = 'r'
                and a.attname = 'manifest_id'
                and t.relnamespace = 'public'::regnamespace;
        `;

        const { data: indexData, error: indexError } = await supabase.rpc('exec_sql', { sql_query: indexQuery });

        console.log("Existing manifest_id indexes:", indexData);
    } catch (err) {
        console.error("Script error:", err);
    }
}

run();
