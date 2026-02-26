import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function debugRpc(legacyId: string) {
    console.log(`Debugging RPC for ${legacyId}...`);

    // 1. Get Member
    const { data: m, error: mErr } = await supabase
        .from('members')
        .select('*')
        .eq('id', legacyId)
        .single();

    if (mErr) { console.error(mErr); return; }
    console.log(`Found: ${m.name}`);

    // 2. Prepare Payload (Copy logic from fix_migrate_to_json.ts)
    // Sanitize check_in_time
    let checkInTime = m.check_in_time;
    if (checkInTime) {
        const d = new Date(checkInTime);
        if (!isNaN(d.getTime())) {
            checkInTime = d.toISOString();
        } else {
            const today = new Date().toISOString().split('T')[0];
            const d2 = new Date(`${today} ${checkInTime}`);
            if (!isNaN(d2.getTime())) checkInTime = d2.toISOString();
            else checkInTime = null;
        }
    }

    // Sanitize Gender
    let gender = m.gender;
    if (gender && !['Male', 'Female'].includes(gender)) {
        if (gender.startsWith('M')) gender = 'Male';
        else if (gender.startsWith('F')) gender = 'Female';
        else gender = null;
    }

    // Sanitize Born Again
    let bornAgain = m.born_again;
    if (bornAgain && !['Yes', 'No'].includes(bornAgain)) {
        if (bornAgain.toLowerCase() === 'true') bornAgain = 'Yes';
        else if (bornAgain.toLowerCase() === 'false') bornAgain = 'No';
        else bornAgain = 'No';
    }

    // Sanitize Status
    let status = m.status;
    const validStatuses = ['Active', 'Absent', 'Review', 'Archived', 'Late'];
    if (status && !validStatuses.includes(status)) {
        status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
        if (!validStatuses.includes(status)) status = 'Active';
    }

    const newId = '00000000-0000-0000-0000-000000009999'; // Dummy UUID

    const rpcPayload = {
        _id: newId,
        _name: m.name,
        _category: m.category,
        _phone: m.phone,
        _status: status,
        _check_in_time: checkInTime,
        _gender: gender,
        _residency: m.residency,
        _born_again: bornAgain,
        _joined_date: m.joined_date,
        _attended_service_ids: m.attended_service_ids || [],
        _current_service_id: null
    };

    console.log('RPC Payload:', JSON.stringify(rpcPayload, null, 2));

    const { error: createErr } = await supabase.rpc('submit_member_entry', rpcPayload);

    if (createErr) {
        console.error('RPC ERROR:', createErr.message);
        console.log('Full Error:', createErr);
    } else {
        console.log('RPC SUCCESS! (Created dummy member)');
        // Cleanup
        await supabase.from('members').delete().eq('id', newId);
    }
}

debugRpc('m-1769097302554');
