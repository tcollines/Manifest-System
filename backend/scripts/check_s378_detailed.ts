import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function checkS378() {
    const serviceId = 'S378';
    console.log(`Checking Service ${serviceId}...`);

    // 1. Total records
    const { count: total } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true }).eq('service_id', serviceId);
    console.log(`Total records in table for ${serviceId}: ${total}`);

    // 2. Count legacy IDs
    const { count: legacyCount } = await supabase
        .from('service_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', serviceId)
        .ilike('member_id', 'm-%');

    console.log(`Legacy IDs (m-*) for ${serviceId}: ${legacyCount}`);

    // 3. Count UUID IDs
    const { count: uuidCount } = await supabase
        .from('service_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', serviceId)
        .not('member_id', 'ilike', 'm-%');

    console.log(`UUID IDs for ${serviceId}: ${uuidCount}`);
}

checkS378();
