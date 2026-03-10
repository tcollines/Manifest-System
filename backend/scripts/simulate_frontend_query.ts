/**
 * Simulates exactly what CampusMinistryEvents.tsx does in the browser
 * but using the anon key (same as the frontend) to test if RLS blocks data.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Use the ANON key (same as frontend), not service role key
const supabaseUrl = 'https://poazorjmzswectxvakzl.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYXpvcmptenN3ZWN0eHZha3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTEyNjgsImV4cCI6MjA4MjM4NzI2OH0.63UUyttqrMAvPYeiA2IIqPxTnk_WftlMLTKQ99Ejv-A';
const supabase = createClient(supabaseUrl, anonKey);

const EVENT_ID = '163f08ad-a151-4579-9519-f6a6da3e3269'; // MEN GATHER IX

async function simulateFrontend() {
    console.log(`\n=== SIMULATING FRONTEND (ANON KEY) for event ${EVENT_ID} ===\n`);

    // Step 1: Get Stations (exactly as CampusMinistryEvents.tsx does at line 27-30)
    console.log("STEP 1: Querying pickup_stations...");
    const { data: stations, error: stationError } = await supabase
        .from('pickup_stations')
        .select('id, name')
        .eq('event_id', EVENT_ID);

    console.log("Station error:", stationError);
    console.log("Station count:", stations?.length ?? 0);
    if (stations && stations.length > 0) {
        console.log("Sample station:", stations[0]);
    } else {
        console.log(">>> NO STATIONS FOUND! This is where the early-return happens <<<");
        console.log(">>> Root cause: RLS is blocking this query with the anon key! <<<");
        return;
    }

    const stationIds = stations.map(s => s.id);

    // Step 2: Get Vehicles
    console.log("\nSTEP 2: Querying vehicles...");
    const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, number_plate, driver_name, driver_contact, coordinator, station_id')
        .in('station_id', stationIds);

    console.log("Vehicle error:", vehicleError);
    console.log("Vehicle count:", vehicles?.length ?? 0);
    if (vehicles && vehicles.length > 0) {
        console.log("Sample vehicle:", vehicles[0]);
    } else {
        console.log(">>> NO VEHICLES FOUND! RLS may be blocking vehicles table <<<");
        return;
    }

    const vehicleIds = vehicles.map(v => v.id);

    // Step 3: Get Passengers (Institution only)
    console.log("\nSTEP 3: Querying passengers (Institution)...");
    const { data: passengers, error: passengerError } = await supabase
        .from('passengers')
        .select('*')
        .eq('event_id', EVENT_ID)
        .in('vehicle_id', vehicleIds)
        .eq('category', 'Institution');

    console.log("Passenger error:", passengerError);
    console.log("Passenger count:", passengers?.length ?? 0);
    if (passengers && passengers.length > 0) {
        console.log("Sample passenger:", passengers[0]);
    } else {
        console.log(">>> NO INSTITUTION PASSENGERS FOUND via anon key! <<<");
    }
}

simulateFrontend().catch(console.error);
