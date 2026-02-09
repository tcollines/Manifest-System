import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function testAlternatives() {
    console.log('Testing Alternative Migration Path...');

    const testOldId = 'm-test-alternative';
    const testNewId = '00000000-0000-0000-0000-000000000077';

    // 1. Create Member via RPC
    console.log('1. Testing submit_member_entry...');
    const { data: createData, error: createError } = await supabase.rpc('submit_member_entry', {
        _id: testNewId,
        _name: 'ALTERNATIVE_TEST',
        _category: 'Member',
        _phone: '256700000077',
        _status: 'Absent',
        _check_in_time: null,
        _gender: 'Male',
        _residency: 'Test',
        _born_again: 'No',
        _joined_date: new Date().toISOString(),
        _attended_service_ids: [],
        _current_service_id: null
    });

    if (createError) {
        console.error('RPC Create Failed:', createError);
        return;
    }
    console.log('RPC Create OK');

    // 2. Test Standard Update on service_attendance
    // We need a dummy attendance record.
    // We can't insert one without a valid member/service usually, but let's try to update a non-existent one just to check permissions/cache.
    console.log('2. Testing service_attendance Update...');
    const { error: updateError } = await supabase
        .from('service_attendance')
        .update({ member_id: testNewId })
        .eq('member_id', testOldId); // Should return 0 rows but valid metadata

    if (updateError) {
        console.error('Attendance Update Failed:', updateError);
    } else {
        console.log('Attendance Update OK (Metadata check passed)');
    }

    // 3. Test Standard Delete on members
    console.log('3. Testing members Delete...');
    const { error: deleteError } = await supabase
        .from('members')
        .delete()
        .eq('id', testNewId);

    if (deleteError) {
        console.error('Member Delete Failed:', deleteError);
    } else {
        console.log('Member Delete OK');
    }
}

testAlternatives();
