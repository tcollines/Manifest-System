
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkEventVehicles(eventId: string) {
    console.log(`Checking vehicles for Event ID: ${eventId}`);

    // Simulate Controller Logic
    console.log("1. Fetching Station IDs...");
    const { data: stations, error: sError } = await supabase
        .from('pickup_stations')
        .select('id, name')
        .eq('event_id', eventId);

    if (sError) {
        console.error("Error fetching stations:", sError);
        return;
    }

    const stationIds = (stations || []).map(s => s.id);
    console.log(`Found ${stationIds.length} stations.`);

    if (stationIds.length === 0) {
        console.log("No stations found. Returning empty.");
        return;
    }

    console.log("2. Fetching Vehicles in these stations...");
    const { data: vehicles, error: vError } = await supabase
        .from('vehicles')
        .select('id, number_plate, station_id, coordinator, status')
        .in('station_id', stationIds);

    if (vError) {
        console.error("Error fetching vehicles:", vError);
        return;
    }

    console.log(`Found ${vehicles?.length} vehicles.`);

    const targetPlate = 'UAR 234G';
    const found = vehicles?.find(v => v.number_plate === targetPlate);

    if (found) {
        console.log(`SUCCESS: Found target vehicle ${targetPlate}!`);
        console.log(JSON.stringify(found, null, 2));
    } else {
        console.log(`FAILURE: Target vehicle ${targetPlate} NOT found in this event list.`);
        console.log("Dumping first 5 vehicles found:");
        vehicles?.slice(0, 5).forEach(v => console.log(` - ${v.number_plate} (St: ${v.station_id})`));

        // Check if it exists globally to be sure
        const { data: globalCheck } = await supabase
            .from('vehicles')
            .select('*')
            .eq('number_plate', targetPlate)
            .single();
        if (globalCheck) {
            console.log(`Global Check: Vehicle exists in station ${globalCheck.station_id}. Is this station in the list? ${stationIds.includes(globalCheck.station_id)}`);
        }
    }
}

const eventId = 'f3976613-0887-4138-b2e1-63a8a5824cdd'; // Men Gather IX
checkEventVehicles(eventId);
