import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function checkAllAttendance() {
    console.log('Checking for indentities of orphaned IDs in other services...');

    // 1. Get orphans again
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
    const ids = Array.from(new Set(att?.map(a => a.member_id)));

    const { data: mems } = await supabase.from('members').select('id').in('id', ids);
    const memSet = new Set(mems?.map(m => m.id));
    const orphans = ids.filter(id => !memSet.has(id));

    console.log(`Orphans remaining: ${orphans.length}`);
    if (orphans.length === 0) return;

    // 2. Check if these IDs have attendance in NOT S378?
    // (Unlikely if they were created during S378)

    // 3. Search for any other backup?
    // Let's check for ALL files in backups directory.
}

checkAllAttendance();
