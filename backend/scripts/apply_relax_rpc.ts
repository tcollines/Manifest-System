import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function applySql() {
    const sqlPath = path.resolve(__dirname, 'relax_rpc.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying SQL to relax RPC...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Failed to apply SQL:', error);
    } else {
        console.log('SQL Applied Successfully.');
    }
}

applySql();
