import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function findEvent() {
    console.log('Searching for ministry event "S378"...');

    // Try various columns
    const { data, error } = await supabase
        .from('ministry_events')
        .select('id, name, code, type, date')
        .or('name.eq.S378,code.eq.S378');

    if (error) { console.error(error); return; }

    if (data && data.length > 0) {
        console.log('Found matching events:', data);

        const eventId = data[0].id;
        const { count } = await supabase
            .from('service_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('service_id', eventId);

        console.log(`Total attendance records for UUID ${eventId}: ${count}`);
    } else {
        console.log('No event found with name or code "S378". Searching for recent events...');
        const { data: recent } = await supabase
            .from('ministry_events')
            .select('id, name, code, date')
            .order('date', { ascending: false })
            .limit(10);
        console.log('Recent events:', recent);
    }
}

findEvent();
