import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const q = `
        SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc ON rc.constraint_name = tc.constraint_name
        WHERE constraint_type = 'FOREIGN KEY' AND tc.table_name = 'members';
    `;
    const { data, error } = await supabase.rpc('exec_sql', { query: q });
    console.log(error || data);
}

check();
