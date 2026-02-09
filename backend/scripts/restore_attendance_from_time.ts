import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function restoreFromCheckInTime() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76'; // S378
    const targetDate = '2026-02-08';

    console.log(`--- RESTORING ATTENDANCE FROM CHECK-IN TIMESTAMP (${targetDate}) ---`);

    // 1. Find all members with check_in_time on Feb 8th
    const { data: members, error: memError } = await supabase
        .from('members')
        .select('id, name, check_in_time')
        .ilike('check_in_time', `${targetDate}%`);

    if (memError) { console.error('Error fetching members:', memError); return; }
    console.log(`Found ${members.length} members with check-in timestamps for ${targetDate}.`);

    if (members.length === 0) return;

    // 2. Fetch existing attendance for S378
    const { data: existingAtt, error: attError } = await supabase
        .from('service_attendance')
        .select('member_id')
        .eq('service_id', serviceId);

    if (attError) { console.error('Error fetching attendance:', attError); return; }
    const attendeeSet = new Set(existingAtt.map(a => a.member_id));

    // 3. Identify missing members
    const missing = members.filter(m => !attendeeSet.has(m.id));
    console.log(`${missing.length} of these are missing from S378 attendance records.`);

    if (missing.length === 0) {
        console.log('No attendance restoration needed.');
        return;
    }

    // 4. Create missing attendance records
    console.log(`Inserting ${missing.length} missing attendance records...`);
    const recordsToInsert = missing.map(m => ({
        member_id: m.id,
        service_id: serviceId,
        check_in_time: m.check_in_time
    }));

    // Insert in batches
    const BATCH_SIZE = 100;
    let inserted = 0;
    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
        const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('service_attendance').insert(batch);
        if (error) {
            console.error(`Batch insert failed:`, error.message);
        } else {
            inserted += batch.length;
        }
    }

    console.log(`RESTORATION COMPLETE: ${inserted} records added.`);
}

restoreFromCheckInTime();
