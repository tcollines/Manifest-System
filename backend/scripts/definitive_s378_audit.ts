import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function definitiveAudit() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const legacy = 'S378';

    const { count: uuidCount } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true }).eq('service_id', uuid);
    const { count: legacyCount } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true }).eq('service_id', legacy);

    console.log(`Definitive Counts:`);
    console.log(`  UUID (${uuid}): ${uuidCount}`);
    console.log(`  Legacy (${legacy}): ${legacyCount}`);

    const arthurId = '18b6ed8c-61ca-4e20-9990-2ff05f889ef5';
    const { data: arthurUUID } = await supabase.from('service_attendance').select('*').eq('service_id', uuid).eq('member_id', arthurId);
    const { data: arthurLegacy } = await supabase.from('service_attendance').select('*').eq('service_id', legacy).eq('member_id', arthurId);

    console.log(`Arthur Attendance:`);
    console.log(`  UUID: ${arthurUUID?.length || 0}`);
    console.log(`  Legacy: ${arthurLegacy?.length || 0}`);

    // Fetch all UUID attendance and check how many members exist
    if (uuidCount && uuidCount > 0) {
        const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', uuid);
        const ids = att?.map(a => a.member_id) || [];
        const { data: mems } = await supabase.from('members').select('id').in('id', ids);
        console.log(`  UUID Matching Members in database: ${mems?.length || 0}`);
    }
}

definitiveAudit();
