import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function testLegacyUpdate() {
    console.log('Testing Standard Update of legacy_id...');

    const testId = '00000000-0000-0000-0000-000000000077'; // Created in previous test?
    // Check if it exists
    const { data, error: fetchErr } = await supabase.from('members').select('id').eq('id', testId).single();

    if (fetchErr || !data) {
        console.log('Test member not found, creating one via RPC...');
        await supabase.rpc('submit_member_entry', {
            _id: testId,
            _name: 'LEGACY_UPDATE_TEST',
            _category: 'Member',
            _phone: '256700000078',
            _joined_date: new Date().toISOString()
        });
    }

    // Try Update
    console.log('Updating legacy_id...');
    const { error: updateErr } = await supabase
        .from('members')
        .update({ legacy_id: 'm-test-legacy-update' })
        .eq('id', testId);

    if (updateErr) {
        console.error('Update Failed:', updateErr);
    } else {
        console.log('Update OK');
    }

    // Clean up
    await supabase.from('members').delete().eq('id', testId);
}

testLegacyUpdate();
