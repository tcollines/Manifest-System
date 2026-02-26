import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function reloadCache() {
    console.log('Reloading PostgREST Schema Cache...');

    const { error } = await supabase.rpc('exec_sql', {
        sql_query: `NOTIFY pgrst, 'reload config';`
    });

    if (error) {
        console.error('Error reloading:', error);
    } else {
        console.log('Cache reload notification sent.');
    }

    // Also check if legacy_id exists just to be sure
    const { data, error: colError } = await supabase.rpc('exec_sql', {
        sql_query: `SELECT column_name FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'legacy_id';`
    });

    console.log('Column Check:', data);
}

reloadCache();
