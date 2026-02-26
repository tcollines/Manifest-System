
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function investigateData() {
    console.log("Investigating Data...");

    // 1. Find 'Night of Prayer' Event
    const { data: events } = await supabase.from('ministry_events').select('*').ilike('title', '%Night of Prayer%');
    console.log("Found Events:", events?.map(e => `${e.title} (${e.id})`));

    if (events && events.length > 0) {
        const targetEvent = events[0]; // Assuming the first one or most recent
        // Find stations for this event
        const { data: stations } = await supabase.from('pickup_stations').select('id, name').eq('event_id', targetEvent.id);
        console.log(`Stations for ${targetEvent.title}:`, stations);
    }

    // 2. Inspect Valid Vehicle 'UAR 234G'
    const { data: vehicle } = await supabase.from('vehicles').select('*').eq('number_plate', 'UAR 234G').single();
    if (vehicle) {
        console.log("\nValid Vehicle 'UAR 234G':");
        console.log("  ID:", vehicle.id);
        console.log("  Event ID:", vehicle.event_id);
        console.log("  Station ID:", vehicle.station_id);
        console.log("  Finance Details:", vehicle.finance_details); // Log this to see why it's not showing
        console.log("  Approvals:", vehicle.approvals);
    }

    // 3. Inspect the 'Ghost' Vehicles (in the same station but NOT UAR 234G)
    // We assume they are in the same station as UAR 234G for now
    if (vehicle) {
        const { data: ghosts } = await supabase.from('vehicles')
            .select('id, number_plate, event_id')
            .eq('station_id', vehicle.station_id)
            .neq('id', vehicle.id);

        console.log(`\nFound ${ghosts?.length} Ghost Vehicles in same station:`);
        ghosts?.forEach(g => console.log(`  - ${g.number_plate} (Event: ${g.event_id})`));
    }
}

investigateData();
