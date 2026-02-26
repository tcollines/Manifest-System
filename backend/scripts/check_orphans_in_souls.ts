
// @ts-nocheck
import { supabase } from '../src/supabase';

export const checkSouls = async () => {
    console.log('--- SEARCHING SOULS FOR ORPHANS ---');

    // 1. Get orphans
    const { data: attendance } = await supabase.from('service_attendance').select('member_id');
    const { data: members } = await supabase.from('members').select('id');
    const memberSet = new Set(members.map(m => m.id));
    const orphans = Array.from(new Set(attendance.filter(a => !memberSet.has(a.member_id)).map(a => a.member_id)));
    console.log(`Searching for ${orphans.length} orphans in souls...`);

    // 2. Search in souls.id
    let found = 0;
    const batchSize = 100;
    for (let i = 0; i < orphans.length; i += batchSize) {
        const batch = orphans.slice(i, i + batchSize);
        const { data } = await supabase.from('souls').select('id, first_name, last_name, phone').in('id', batch);
        if (data && data.length > 0) {
            found += data.length;
            console.log(`Found ${data.length} in souls! Example: ${data[0].first_name} ${data[0].last_name}`);
        }
    }

    console.log(`TOTAL FOUND IN SOULS: ${found}`);
    process.exit(0);
};

checkSouls();
