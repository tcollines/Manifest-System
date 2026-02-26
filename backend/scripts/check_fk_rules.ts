import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkConstraints() {
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
      SELECT
        conname AS constraint_name,
        conrelid::regclass AS table_name,
        confrelid::regclass AS foreign_table_name,
        confupdtype AS update_rule
      FROM pg_constraint
      WHERE confrelid = 'members'::regclass;
    `
    });

    if (error) {
        console.error('Error:', error);
        return;
    }

    // confupdtype: a = no action, r = restrict, c = cascade, n = set null, d = set default
    console.log('FK Constraints on members table:');
    console.table(data);
}

checkConstraints();
