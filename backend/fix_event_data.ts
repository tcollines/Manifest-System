
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function fixEventData() {
    console.log("Fixing Event Data (Populating event_id)...");

    // 1. Check if column exists first
    const { error: colCheck } = await supabase.from('vehicles').select('event_id').limit(1);
    if (colCheck) {
        console.error("Column 'event_id' does not exist in 'vehicles' table. Please run the SQL migration first.");
        return;
    }

    // 2. Get all vehicles with missing event_id
    // We select vehicles where event_id is null
    const { data: vehicles, error: vErr } = await supabase.from('vehicles').select('id, station_id, number_plate').is('event_id', null);

    if (vErr) { console.error("Vehicle fetch failed:", vErr); return; }

    if (!vehicles || vehicles.length === 0) {
        console.log("No vehicles found with missing event_id.");
        return;
    }

    console.log(`Found ${vehicles.length} vehicles with missing event_id. Updating...`);

    // 3. For each vehicle, look up station -> event_id and update
    let updatedCount = 0;

    // Optimization: Get map of station_id -> event_id
    const stationIds = [...new Set(vehicles.map(v => v.station_id))];
    const { data: stations } = await supabase.from('pickup_stations').select('id, event_id').in('id', stationIds);

    const stationMap: Record<string, string> = {};
    stations?.forEach(s => { stationMap[s.id] = s.event_id; });

    for (const v of vehicles) {
        const eventId = stationMap[v.station_id];
        if (eventId) {
            const { error: uErr } = await supabase.from('vehicles').update({ event_id: eventId }).eq('id', v.id);
            if (uErr) console.error(`Failed to update vehicle ${v.id}:`, uErr);
            else {
                console.log(`Updated Vehicle ${v.id} (Plate: ${v.number_plate}) -> Event ${eventId}`);
                updatedCount++;
            }
        } else {
            console.warn(`Station ${v.station_id} not found or has no event_id for vehicle ${v.id} (Plate: ${v.number_plate})`);
        }
    }

    console.log(`Successfully populated event_id for ${updatedCount} vehicles.`);
}

fixEventData();
