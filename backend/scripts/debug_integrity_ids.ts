
// @ts-nocheck
import { supabase } from '../src/supabase';

export const debugIds = async () => {
    console.log('--- DEBUG IDs ---');

    // 1. Get 5 broken attendance rows
    // We need to find rows where member_id is not a valid UUID in members.
    // Fetch all members IDs first (set)
    const { data: members } = await supabase.from('members').select('id, legacy_id');
    const memberIds = new Set(members.map(m => m.id));

    // Fetch attendance
    const { data: attendance } = await supabase.from('service_attendance').select('member_id').limit(1000);

    const broken = attendance.filter(a => !memberIds.has(a.member_id));

    console.log(`Found ${broken.length} broken in sample.`);
    console.log('--- Broken Member IDs (Attendance) ---');
    broken.slice(0, 5).forEach(b => console.log(`'${b.member_id}' (Type: ${typeof b.member_id})`));

    console.log('--- Valid Legacy IDs (Members) ---');
    members.filter(m => m.legacy_id).slice(0, 5).forEach(m => console.log(`'${m.legacy_id}'`));

    process.exit(0);
};

debugIds();
