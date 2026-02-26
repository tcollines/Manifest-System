import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function finalOrphanAudit() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    // 1. Get Arthur's ID
    const { data: arthur } = await supabase.from('members').select('id, name').ilike('name', '%Mwondha Arthur%').single();
    console.log('Arthur in DB:', arthur);

    // 2. Get S378 attendance
    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
    console.log(`Found ${att?.length || 0} attendance records for S378.`);

    if (att && att.length > 0) {
        const attendeeIds = new Set(att.map(a => a.member_id));

        if (arthur && attendeeIds.has(arthur.id)) {
            console.log('Arthur IS in S378 attendance!');
        } else if (arthur) {
            console.log('Arthur is NOT in S378 attendance.');
        }

        // 3. Check how many attendeeIds are in the members table
        const uniqueIds = Array.from(attendeeIds);
        const { data: validMems } = await supabase.from('members').select('id').in('id', uniqueIds.slice(0, 1000)); // Sample check
        console.log(`Healthy members in sample: ${validMems?.length || 0} out of ${Math.min(uniqueIds.length, 1000)}`);
    }
}

finalOrphanAudit();
