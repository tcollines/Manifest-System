import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function inspectFinal() {
    const id = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    console.log(`Inspecting S378 (UUID: ${id})...`);

    const { data, error } = await supabase
        .from('ministry_events')
        .select('id, title, date, stats')
        .eq('id', id)
        .single();

    if (error) { console.error(error); return; }

    console.log('Event Data:');
    console.log(JSON.stringify(data, null, 2));

    // Check attendance for this UUID AGAIN
    const { count } = await supabase
        .from('service_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', id);

    console.log(`Total attendance records in table for this UUID: ${count}`);

    if (count === 0) {
        // Maybe it's stored as 'S378' in service_id?
        const { count: sCount } = await supabase
            .from('service_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('service_id', 'S378');
        console.log(`Total attendance records for 'S378': ${sCount}`);
    }
}

inspectFinal();
