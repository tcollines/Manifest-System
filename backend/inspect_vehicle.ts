
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function inspectVehicle(vehicleId: string) {
    console.log(`Inspecting Vehicle ID: ${vehicleId}`);

    // Get Vehicle
    const { data: vehicle, error: vError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();

    if (vError) {
        console.error("Error fetching vehicle:", vError);
        return;
    }

    if (!vehicle) {
        console.error("Vehicle not found.");
        return;
    }

    console.log("Vehicle Details:");
    console.log(`  - Plate: ${vehicle.number_plate}`);
    console.log(`  - Station ID: ${vehicle.station_id}`);
    console.log(`  - Coordinator: ${vehicle.coordinator}`);

    // Get Station
    const { data: station, error: sError } = await supabase
        .from('pickup_stations')
        .select('*')
        .eq('id', vehicle.station_id)
        .single();

    if (sError) {
        console.error("Error fetching station:", sError);
        return;
    }

    if (station) {
        console.log("Station Details:");
        console.log(`  - Name: ${station.name}`);
        console.log(`  - Event ID: ${station.event_id}`);

        // Get Event
        const { data: event, error: eError } = await supabase
            .from('ministry_events')
            .select('*')
            .eq('id', station.event_id)
            .single();

        if (event) {
            console.log("Event Details:");
            console.log(`  - Title: ${event.title}`);
            console.log(`  - Date: ${event.date}`);
        } else {
            console.log("Event not found for this station.");
        }
    } else {
        console.log("Station not found for this vehicle.");
    }
}

const targetId = process.argv[2] || '15aeaeff-4c82-466e-b033-6a5aa43732bc';
inspectVehicle(targetId);
