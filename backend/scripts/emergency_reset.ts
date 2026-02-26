import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function emergencyDrop() {
    console.log('Emergency Drop of legacy_id...');

    const { error } = await supabase.rpc('exec_sql', {
        sql_query: "ALTER TABLE members DROP COLUMN IF EXISTS legacy_id;"
    });

    if (error) {
        console.error('Drop Failed:', error);
    } else {
        console.log('Drop OK. Verifying access...');

        // Test simple select
        const { error: selErr } = await supabase.from('members').select('count').limit(1).single();
        if (selErr) console.error('Select Failed:', selErr);
        else console.log('Select OK');

        // Test insert (dummy)
        const testId = '00000000-0000-0000-0000-000000000099';
        const sql = `INSERT INTO members (id, name, created_at) VALUES ('${testId}', 'CACHE_RECOVERY_TEST', NOW())`;
        const { error: insErr } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (insErr) {
            console.error('Insert Test Failed:', insErr);
        } else {
            console.log('Insert Test OK');
            await supabase.rpc('exec_sql', { sql_query: `DELETE FROM members WHERE id = '${testId}'` });
        }
    }
}

emergencyDrop();
