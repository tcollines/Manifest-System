require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function simulate() {
    const manifestId = '593fbdbb-8211-44ca-b3e2-8d999c88680c';

    // Get ALL vehicles for the manifest to see what their eventIDs are
    let query = supabase.from('vehicles').select('id, number_plate, event_id, status').eq('manifest_id', manifestId);

    const { data, error } = await query;
    if (error) {
        console.error(error);
        return;
    }

    console.log(`Total Vehicles in DB: ${data.length}`);

    // Group vehicles by Event ID
    const grouped = {};
    for (const v of data) {
        const eid = v.event_id || 'NO_EVENT';
        if (!grouped[eid]) grouped[eid] = 0;
        grouped[eid]++;
    }

    console.log('Vehicle Distribution mapped by Event ID:');
    for (const [eid, count] of Object.entries(grouped)) {
        console.log(`- Event ID: ${eid} -> ${count} vehicles`);
    }

    // Now let's fetch the actual name of Event 45d645f1... and f3976613...
    const { data: events } = await supabase.from('ministry_events').select('id, title').in('id', ['45d645f1-fbd7-4d1d-94cc-5f22c99625b5', 'f3976613-0887-4138-b2e1-63a8a5824cdd']);
    console.log('\nEvent Names:');
    if (events) {
        for (const e of events) {
            console.log(`- ${e.id} = ${e.title}`);
        }
    }
}
simulate();
