require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

async function run() {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: user } = await sb.from('users').select('manifest_id').limit(1).single();
    const manifestId = user.manifest_id;

    const serviceId = uuidv4();
    await sb.from('ministry_events').insert({
        id: serviceId,
        manifest_id: manifestId,
        title: 'Test CheckIn Integration',
        date: new Date().toISOString().split('T')[0],
        type: 'Service'
    });

    const memberId = uuidv4();

    // Step 1: Add new member blindly
    const payload = {
        _manifest_id: manifestId,
        _id: memberId,
        _name: 'Test Controller Integration',
        _category: 'First Timer',
        _phone: '256700000000',
        _status: 'Checked In',
        _check_in_time: new Date().toISOString(),
        _gender: 'Male',
        _residency: 'Test',
        _born_again: true,
        _joined_date: new Date().toISOString(),
        // Intentionally pass empty array since we proved the RPC fails anyway
        _attended_service_ids: [],
        _current_service_id: serviceId
    };

    await sb.rpc('submit_member_entry', payload);

    // Step 2: Explicit Check-In (What Express controller does)
    const rows = [{
        manifest_id: manifestId,
        member_id: memberId,
        service_id: serviceId,
        check_in_time: new Date().toISOString()
    }];

    const { error: insErr } = await sb.from('service_attendance').insert(rows);
    console.log('Explicit Attendance Insert Error:', insErr ? insErr.message : 'Success');

    const { data: att } = await sb.from('service_attendance').select('*').eq('service_id', serviceId);
    console.log('Attendance Records found:', att?.length || 0);

    // Clean
    await sb.from('service_attendance').delete().eq('service_id', serviceId);
    await sb.from('members').delete().eq('id', memberId);
    await sb.from('ministry_events').delete().eq('id', serviceId);

    process.exit(0);
}
run().catch(console.error);
