
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkMigrationStatus() {
    console.log("Checking Migration Status...");

    const NIGHT_OF_PRAYER_ID = 'bde9329f-2746-40b1-b2eb-56f2fcf028ee';
    const MEN_GATHER_ID = 'f3976613-0887-4138-b2e1-63a8a5824cdd';

    // Check Night of Prayer Vehicles
    const { data: nopVehicles, error: nopError } = await supabase
        .from('vehicles')
        .select('id, number_plate, station_id, event_id')
        .eq('station_id', '9e975148-7323-44e2-a083-d52f6797825b'); // S&S Stage in NoP (example ID, might be different, let's just query all vehicles and filter in JS if needed, but better use station lookup)

    // Get Stations for NoP
    const { data: nopStations } = await supabase.from('pickup_stations').select('id, name').eq('event_id', NIGHT_OF_PRAYER_ID);
    const nopStationIds = nopStations?.map(s => s.id) || [];

    // Get Vehicles in NoP Stations
    const { data: vehiclesInNop, error: vError } = await supabase
        .from('vehicles')
        .select('id, number_plate, station_id, event_id')
        .in('station_id', nopStationIds);

    if (vError) {
        console.error("Error fetching vehicles:", vError);
        return;
    }

    console.log(`Vehicles in Night of Prayer Stations (${nopStations?.length} stations): ${vehiclesInNop?.length}`);
    if (vehiclesInNop && vehiclesInNop.length > 0) {
        console.log("Sample:", vehiclesInNop[0]);
    }

    // Check Men Gather Vehicles
    // Get Stations for MG
    const { data: mgStations } = await supabase.from('pickup_stations').select('id, name').eq('event_id', MEN_GATHER_ID);
    const mgStationIds = mgStations?.map(s => s.id) || [];

    const { data: vehiclesInMg } = await supabase
        .from('vehicles')
        .select('id, number_plate, station_id, event_id')
        .in('station_id', mgStationIds);

    console.log(`Vehicles in Men Gather Stations (${mgStations?.length} stations): ${vehiclesInMg?.length}`);
    if (vehiclesInMg && vehiclesInMg.length > 0) {
        console.log("Sample:", vehiclesInMg[0]);
        // Check if event_id is populated
        const withEventId = vehiclesInMg.filter(v => v.event_id === MEN_GATHER_ID);
        console.log(`Vehicles with CORRECT event_id: ${withEventId.length} / ${vehiclesInMg.length}`);
    }

    // Check specific vehicle UBM 677Y
    const { data: specificVehicle } = await supabase.from('vehicles').select('*').eq('number_plate', 'UBM 677Y').single();
    if (specificVehicle) {
        console.log("\nSpecific Vehicle UBM 677Y:", JSON.stringify(specificVehicle, null, 2));
    } else {
        console.log("\nSpecific Vehicle UBM 677Y NOT FOUND.");
    }
}

checkMigrationStatus();
