import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function debugEmptyPhone() {
    const legacyId = 'm-bulk-1767018649104-0vi32'; // ADERO FRIDAH
    console.log(`Debugging ${legacyId}...`);

    const { data: member } = await supabase.from('members').select('*').eq('id', legacyId).single();

    if (!member) { console.log('Member not found'); return; }

    console.log('Name:', member.name);
    console.log('Phone Raw:', `'${member.phone}'`); // Quote to see empty string
    console.log('Phone Type:', typeof member.phone);

    // Try RPC Create with this data
    const newId = '00000000-0000-0000-0000-000000008888';
    const rpcPayload = {
        _id: newId,
        _name: member.name,
        _category: member.category,
        _phone: member.phone, // Pass as is
        _status: member.status,
        _check_in_time: null,
        _gender: member.gender,
        _residency: member.residency,
        _born_again: member.born_again,
        _joined_date: member.joined_date,
        _attended_service_ids: [],
        _current_service_id: null
    };

    console.log('Attempting RPC Create...');
    const { error } = await supabase.rpc('submit_member_entry', rpcPayload);

    if (error) {
        console.error('RPC Failed:', error.message);
        console.log('Details:', error.details);
    } else {
        console.log('RPC Success (It worked?)');
        await supabase.from('members').delete().eq('id', newId);
    }
}

debugEmptyPhone();
