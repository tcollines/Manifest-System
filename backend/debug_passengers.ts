
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debugPassengers() {
    console.log("Debugging Passenger Visibility...");

    const MEN_GATHER_ID = 'f3976613-0887-4138-b2e1-63a8a5824cdd';

    // 1. Get Stations for Men Gather
    const { data: mgStations } = await supabase.from('pickup_stations').select('id, name').eq('event_id', MEN_GATHER_ID);
    console.log(`Men Gather Stations: ${mgStations?.length}`);
    if (mgStations) {
        // Find S&S
        const ss = mgStations.find(s => s.name.toLowerCase().includes('s & s') || s.name.toLowerCase().includes('s and s'));
        console.log("S & S Station in MG:", ss);

        const stationIds = mgStations.map(s => s.id);

        // 2. Get Vehicles in these stations
        const { data: vehicles } = await supabase.from('vehicles').select('*').in('station_id', stationIds);
        console.log(`Vehicles in MG Stations: ${vehicles?.length}`);

        if (vehicles && vehicles.length > 0) {
            console.log("Sample Vehicle:", vehicles[0]);
            const vehicleIds = vehicles.map(v => v.id);

            // 3. Get Passengers in these vehicles
            const { data: passengers } = await supabase.from('passengers').select('*').in('vehicle_id', vehicleIds);
            console.log(`Passengers in MG Vehicles: ${passengers?.length}`);
            if (passengers && passengers.length > 0) {
                console.log("Sample Passenger:", passengers[0]);
            } else {
                console.log("NO Passengers found in MG Vehicles.");
            }
        } else {
            console.log("NO Vehicles found in MG Stations.");
        }
    }
}

debugPassengers();
