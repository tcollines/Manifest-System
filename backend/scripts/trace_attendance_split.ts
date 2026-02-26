import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function traceAttendance() {
    const arthurMaster = '18b6ed8c-61ca-4e20-9990-2ff05f889ef5';
    const legacyArthur = 'm-74844391'; // Assuming this from previous contexts or mapping

    // Actually, let's just search for ANY attendance for the legacy 'S378'
    const { data: legacyAtt } = await supabase.from('service_attendance').select('member_id').eq('service_id', 'S378');
    console.log(`Total attendance records using 'S378': ${legacyAtt?.length || 0}`);

    if (legacyAtt && legacyAtt.length > 0) {
        const ids = legacyAtt.map(a => a.member_id);
        const { data: mems } = await supabase.from('members').select('id').in('id', ids);
        console.log(`  Matching members for 'S378' records: ${mems?.length || 0}`);

        const orphans = ids.length - (mems?.length || 0);
        console.log(`  Orphans in 'S378' records: ${orphans}`);
    }

    // Same for UUID
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const { data: uuidAtt } = await supabase.from('service_attendance').select('member_id').eq('service_id', uuid);
    console.log(`Total attendance records using UUID: ${uuidAtt?.length || 0}`);

    if (uuidAtt && uuidAtt.length > 0) {
        const ids = uuidAtt.map(a => a.member_id);
        const { data: mems } = await supabase.from('members').select('id').in('id', ids);
        console.log(`  Matching members for UUID records: ${mems?.length || 0}`);

        const orphans = ids.length - (mems?.length || 0);
        console.log(`  Orphans in UUID records: ${orphans}`);
    }
}

traceAttendance();
