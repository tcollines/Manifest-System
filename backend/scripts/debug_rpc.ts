import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runSql(sql: string) {
    console.log(`Executing SQL: ${sql}`);
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error('SQL Execution Failed:', error);
    } else {
        console.log('Result:', JSON.stringify(data, null, 2));
    }
}

const sql = process.argv.slice(2).join(' ');
if (sql) {
    runSql(sql);
} else {
    console.log('Usage: npx ts-node debug_rpc.ts "SELECT ..."');
}
