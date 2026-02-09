import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function findEventsByDate() {
    const dates = ['2026-02-08', '2026-02-05']; // Check both S378 and Night of Prayer
    console.log(`Searching events on: ${dates.join(', ')}`);

    const { data: events } = await supabase.from('ministry_events').select('*').in('date', dates);

    events?.forEach(e => {
        console.log(`\nEvent: ${e.title} [${e.id}] | Date: ${e.date}`);
        // Count attendance
        // Note: use count query for speed
    });
}

findEventsByDate();
