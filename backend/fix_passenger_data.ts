
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function fixPassengerData() {
    console.log("Fixing Passenger Data (Populating event_id)...");

    // 1. Get passengers with missing event_id
    const { data: passengers, error: pErr } = await supabase.from('passengers').select('id, vehicle_id').is('event_id', null);

    if (pErr) { console.error("Passenger fetch failed:", pErr); return; }

    if (!passengers || passengers.length === 0) {
        console.log("No passengers found with missing event_id.");
        return;
    }

    console.log(`Found ${passengers.length} passengers with missing event_id. Updating...`);

    // 2. Get Vehicle -> Event Map
    const vehicleIds = [...new Set(passengers.map(p => p.vehicle_id))];
    const { data: vehicles } = await supabase.from('vehicles').select('id, event_id').in('id', vehicleIds);

    const vehicleMap: Record<string, string> = {};
    vehicles?.forEach(v => { vehicleMap[v.id] = v.event_id; });

    let updatedCount = 0;
    for (const p of passengers) {
        const eventId = vehicleMap[p.vehicle_id];
        if (eventId) {
            const { error: uErr } = await supabase.from('passengers').update({ event_id: eventId }).eq('id', p.id);
            if (uErr) console.error(`Failed to update passenger ${p.id}:`, uErr);
            else updatedCount++;
        } else {
            console.warn(`Vehicle ${p.vehicle_id} not found or has no event_id for passenger ${p.id}`);
        }
    }

    console.log(`Successfully populated event_id for ${updatedCount} passengers.`);
}

fixPassengerData();
