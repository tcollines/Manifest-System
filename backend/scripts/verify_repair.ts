
import { supabase } from '../src/supabase';

async function verify() {
    console.log('Verifying service_attendance integrity...');

    // 1. Fetch all attendance
    const { data: attendance, error: attError } = await supabase
        .from('service_attendance')
        .select('id, member_id');

    if (attError) { console.error(attError); return; }
    console.log(`Checking ${attendance.length} attendance records...`);

    // 2. Fetch all members
    const { data: members, error: memError } = await supabase
        .from('members')
        .select('id');

    if (memError) { console.error(memError); return; }
    const memberIds = new Set(members.map(m => m.id));
    console.log(`Against ${memberIds.size} valid members.`);

    // 3. Check for broken links
    const broken = attendance.filter(a => !memberIds.has(a.member_id));

    if (broken.length === 0) {
        console.log('✅ SUCCESS: 0 broken records found. Integrity restored.');
    } else {
        console.error(`❌ FAILURE: ${broken.length} broken records still exist!`);
        console.log('Sample Broken IDs:', broken.slice(0, 5).map(b => b.member_id));
    }
}

verify().catch(console.error);
