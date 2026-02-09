import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function findByNumber() {
    console.log('Searching for service_number = 378...');
    const { data, error } = await supabase
        .from('ministry_events')
        .select('*')
        .eq('service_number', 378);

    if (error) { console.error(error); return; }

    if (data && data.length > 0) {
        console.log('Found Service 378:');
        console.log(JSON.stringify(data[0], null, 2));

        const eventId = data[0].id;
        const { count } = await supabase
            .from('service_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('service_id', eventId);

        console.log(`\nAttendance records in table for UUID ${eventId}: ${count}`);
    } else {
        console.log('No service found with number 378.');
    }
}

findByNumber();
