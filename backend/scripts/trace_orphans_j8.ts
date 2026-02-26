import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function traceOrphansByIdentity() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    // 1. Get orphans
    const { data: att } = await supabase.from('service_attendance').select('id, member_id').eq('service_id', serviceId);
    if (!att) return;
    const ids = Array.from(new Set(att.map(a => a.member_id)));
    const { data: mems } = await supabase.from('members').select('id').in('id', ids);
    const memSet = new Set(mems?.map(m => m.id));
    const orphans = att.filter(a => !memSet.has(a.member_id));

    console.log(`Deep tracing ${orphans.length} orphan records...`);

    // 2. Since we don't have identities for these IDs, let's try to find ANY related records.
    // Wait! Is there any chance these IDs are actually in the 'members' table but the IDs are different?
    // No, that's what orphan means.

    // SEARCH STRATEGY: 
    // If we have no names, how can we find them?
    // "if the service date ... corresponds to the date they joined and they have the first timer tag they are first timers in that service"

    // I will find ALL members who joined on Feb 8th.
    // I will check which ones do NOT have an attendance record for S378.
    // I'll count them. If it's close to 522, then bingo!

    const { data: j8 } = await supabase.from('members').select('id, name').ilike('joined_date', '2026-02-08%');
    console.log(`Members who joined on Feb 8th: ${j8?.length || 0}`);

    if (j8) {
        const j8Set = new Set(j8.map(m => m.id));
        const j8Attendees = mems?.filter(m => j8Set.has(m.id)) || [];
        console.log(`  Of these, ${j8Attendees.length} are already in S378 attendance.`);

        const missingJ8 = j8.filter(m => !mems?.some(x => x.id === m.id));
        console.log(`  ${missingJ8.length} joined on Feb 8th but are MISSING from S378 attendance.`);
    }
}

traceOrphansByIdentity();
