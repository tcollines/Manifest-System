
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const query = `
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'finance_transactions';
`;

async function run() {
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: query });
    if (error) {
        console.error("RPC Error:", error.message);
        // Fallback: try to insert a transaction with a fake event ID (uuid formatted) vs fake text
        // If event_id is UUID type, text will fail.
        // If event_id has FK, non-existent UUID will fail.

        console.log("Testing constraints via insert...");
        const { error: typeError } = await supabase.from('finance_transactions').select('*').eq('event_id', 'invalid-text-id');
        if (typeError && typeError.message.includes('uuid')) {
            console.log("event_id column is UUID type.");
        } else {
            console.log("event_id column is TEXT type.");
        }
    } else {
        console.table(data);
    }
}

run();
