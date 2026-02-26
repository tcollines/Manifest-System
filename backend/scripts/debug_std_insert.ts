import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function debugStd() {
    console.log('Testing Standard Client INSERT...');

    const id1 = '00000000-0000-0000-0000-000000000002';

    // 1. Insert without legacy_id
    const { error: e1 } = await supabase.from('members').insert({
        id: id1,
        name: 'STD_INSERT_TEST',
        created_at: new Date().toISOString()
    });

    if (e1) {
        console.error('Insert (No Legacy) Failed:', e1);
    } else {
        console.log('Insert (No Legacy) OK');
        await supabase.from('members').delete().eq('id', id1);
    }

    const id2 = '00000000-0000-0000-0000-000000000003';
    // 2. Insert WITH legacy_id
    const { error: e2 } = await supabase.from('members').insert({
        id: id2,
        name: 'STD_INSERT_LEGACY_TEST',
        created_at: new Date().toISOString(),
        legacy_id: 'm-test-123'
    });

    if (e2) {
        console.error('Insert (With Legacy) Failed:', e2);
    } else {
        console.log('Insert (With Legacy) OK');
        await supabase.from('members').delete().eq('id', id2);
    }
}

debugStd();
