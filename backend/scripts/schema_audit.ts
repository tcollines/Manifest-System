import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function schemaAudit() {
    const { data: cols, error } = await supabase.rpc('get_cols', { table_name: 'members' });
    if (error) {
        console.log('RPC Failed, trying to fetch via postgres statistics.');
        const { data: cols2 } = await supabase.from('members').select('*').limit(1);
        if (cols2 && cols2.length > 0) {
            console.log('Columns found in data:', Object.keys(cols2[0]));
        }
    } else {
        console.log('Table Schema:', cols);
    }
}

schemaAudit();
