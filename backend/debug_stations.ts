
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debugStations() {
    console.log("Debugging Stations...");

    const eventId = 'f3976613-0887-4138-b2e1-63a8a5824cdd'; // Men Gather IX (Assuming this is current)
    // If not, fetch it by name
    // const { data: event } = await supabase.from('ministry_events').select('id').eq('title', 'Men Gather IX').single();
    // const eventId = event.id;

    console.log(`Event ID: ${eventId}`);

    // Get Stations for this event
    const { data: stations } = await supabase.from('pickup_stations').select('id, name, created_at, event_id').eq('event_id', eventId);

    if (!stations || stations.length === 0) {
        console.log("No stations found for this event.");
        return;
    }

    console.log(`Found ${stations.length} stations.`);

    for (const s of stations) {
        // Count vehicles
        const { count } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('station_id', s.id);
        console.log(`Station: ${s.name} (${s.id}) - Created: ${s.created_at} - Vehicles: ${count}`);

        if (count && count > 0) {
            const { data: vehicles } = await supabase.from('vehicles').select('number_plate, created_at, event_id').eq('station_id', s.id);
            if (vehicles) {
                console.log(`  Vehicles in ${s.name}:`);
                vehicles.forEach(v => {
                    console.log(`    - ${v.number_plate} (Created: ${v.created_at}, Event: ${v.event_id})`);
                });
            }
        }
    }
}

debugStations();
