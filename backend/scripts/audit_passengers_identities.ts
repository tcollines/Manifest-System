
// @ts-nocheck
import { supabase } from '../src/supabase';

export const audit = async () => {
    console.log('--- AUDITING PASSENGERS FOR ORPHANS ---');

    // 1. Collect all broken IDs from attendance
    let brokenIds = new Set();
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('service_attendance').select('member_id').range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        data.forEach(m => brokenIds.add(m.id || m.member_id)); // member_id is the col name
        page++;
    }

    const { data: members } = await supabase.from('members').select('id');
    const memberSet = new Set(members?.map(m => m.id));

    const orphans = Array.from(brokenIds).filter(id => !memberSet.has(id));
    console.log(`Total Orphans identified: ${orphans.length}`);

    // 2. Search in passengers
    console.log('Searching passengers table in chunks...');
    let foundCount = 0;
    const batchSize = 100;
    for (let i = 0; i < orphans.length; i += batchSize) {
        const batch = orphans.slice(i, i + batchSize);
        const { data, error } = await supabase.from('passengers').select('member_id, name, contact, residence').in('member_id', batch);
        if (error) {
            console.error(error);
        } else if (data) {
            foundCount += data.length;
            if (data.length > 0) {
                console.log(`Found ${data.length} in this batch. Sample:`, data[0].name);
            }
        }
    }

    console.log(`TOTAL Identities found in passengers: ${foundCount}`);
    process.exit(0);
};

audit();
