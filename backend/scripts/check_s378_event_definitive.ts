import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function checkS378Event() {
    const { data: events } = await supabase.from('ministry_events').select('*').ilike('title', '%378%');
    console.log('Events matching 378:', events);

    if (events && events.length > 0) {
        const id = events[0].id;
        const { count } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true }).eq('service_id', id);
        console.log(`\nRecords in service_attendance for UUID ${id}: ${count}`);
    }
}

checkS378Event();
