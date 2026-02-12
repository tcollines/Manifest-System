
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function scan() {
    console.log('--- SCANNING SERVICE LINKS ---');
    const { data: services } = await supabase
        .from('ministry_events')
        .select('id, title, date')
        .gte('date', '2026-01-01')
        .neq('type', 'Event');

    let totalLinked = 0;

    for (const s of services) {
        const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('first_timer_service_id', s.id);

        if (count > 0) {
            console.log(`${s.date} | ${s.title}: ${count}`);
            totalLinked += count;
        }
    }
    console.log(`TOTAL DETECTED IN SERVICES: ${totalLinked}`);
}
scan();
