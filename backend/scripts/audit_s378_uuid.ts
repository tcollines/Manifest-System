import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function auditS378UUID() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76'; // S378
    console.log(`Auditing attendance for UUID: ${serviceId} (S378)`);

    // 1. Total records
    const { count: total } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true }).eq('service_id', serviceId);
    console.log(`Total attendance records : ${total}`);

    // 2. Sample records
    const { data, error } = await supabase
        .from('service_attendance')
        .select('member_id')
        .eq('service_id', serviceId)
        .limit(10);

    if (data && data.length > 0) {
        console.log('Sample member_ids:', data.map(d => d.member_id));

        const legacy = data.filter(d => d.member_id.startsWith('m-'));
        console.log(`Legacy IDs in sample: ${legacy.length}`);

        const { count: totalLegacy } = await supabase
            .from('service_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('service_id', serviceId)
            .ilike('member_id', 'm-%');
        console.log(`Total Legacy IDs for S378: ${totalLegacy}`);
    }
}

auditS378UUID();
