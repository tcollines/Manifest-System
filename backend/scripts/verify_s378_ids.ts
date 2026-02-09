import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function verifyS378Attendance() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    // 1. Check with UUID
    const { count: uuidCount } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true }).eq('service_id', uuid);
    console.log(`Count with UUID: ${uuidCount}`);

    // 2. Check with 'S378'
    const { count: legCount } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true }).eq('service_id', 'S378');
    console.log(`Count with Legacy ID 'S378': ${legCount}`);

    // 3. Check what's actually there
    const { data: sample } = await supabase.from('service_attendance').select('service_id').limit(5);
    console.log('Sample service_ids in attendance:', sample);
}

verifyS378Attendance();
