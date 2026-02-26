import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function getCols() {
    console.log('Fetching directory of columns for ministry_events...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'ministry_events'"
    });

    if (error) {
        console.log('exec_sql failed. Trying standard select of 1 row with no columns specified...');
        const { data: rows } = await supabase.from('ministry_events').select('*').limit(1);
        if (rows && rows.length > 0) {
            console.log('Columns found:', Object.keys(rows[0]));
        }
        return;
    }

    console.log('Columns:', data.map((d: any) => d.column_name));
}

getCols();
