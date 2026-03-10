import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function diagnose() {
    console.log("=== STEP 1: Find the MEN GATHER event ===");
    const { data: events } = await supabase
        .from('ministry_events')
        .select('id, title, manifest_id')
        .ilike('title', '%MEN GATHER%');

    console.log("Events found:", JSON.stringify(events, null, 2));

    if (!events || events.length === 0) {
        console.log("No events found!");
        return;
    }

    for (const ev of events) {
        console.log(`\n=== STEP 2: Pickup Stations for event ${ev.id} ===`);
        const { data: stations, error: stErr } = await supabase
            .from('pickup_stations')
            .select('id, name, event_id, manifest_id')
            .eq('event_id', ev.id);

        console.log("Station error:", stErr);
        console.log("Station count:", stations?.length || 0);
        if (stations && stations.length > 0) {
            console.log("Sample station:", stations[0]);
        }

        if (!stations || stations.length === 0) {
            console.log("--> No stations found for this event_id. Checking with .ilike...");
            // Maybe the event_id in pickup_stations is stored differently?
            const { data: allStations } = await supabase
                .from('pickup_stations')
                .select('id, name, event_id')
                .limit(5);
            console.log("Sample stations in DB (first 5):", JSON.stringify(allStations, null, 2));
            continue;
        }

        const stationIds = stations.map(s => s.id);

        console.log(`\n=== STEP 3: Vehicles linked to station_ids ===`);
        const { data: vehicles, error: vehErr } = await supabase
            .from('vehicles')
            .select('id, number_plate, station_id, event_id')
            .in('station_id', stationIds);

        console.log("Vehicle error:", vehErr);
        console.log("Vehicle count:", vehicles?.length || 0);
        if (vehicles && vehicles.length > 0) {
            console.log("Sample vehicle:", vehicles[0]);
        }

        if (!vehicles || vehicles.length === 0) {
            console.log("--> No vehicles found linked to those station_ids.");
            continue;
        }

        const vehicleIds = vehicles.map(v => v.id);

        console.log(`\n=== STEP 4: Passengers for event_id + vehicle_ids ===`);
        const { data: passengers, error: pErr } = await supabase
            .from('passengers')
            .select('id, name, category, is_first_time, soul_won, vehicle_id, event_id, station_id')
            .eq('event_id', ev.id)
            .in('vehicle_id', vehicleIds);

        console.log("Passenger error:", pErr);
        console.log("Passenger count:", passengers?.length || 0);
        if (passengers && passengers.length > 0) {
            const cats: Record<string, number> = {};
            passengers.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
            console.log("Passengers by category:", cats);
            console.log("Sample passenger:", passengers[0]);
        }

        // Specifically look for Institution passengers
        const institutionPassengers = passengers?.filter(p => p.category === 'Institution') || [];
        console.log(`\nInstitution passengers directly from this step: ${institutionPassengers.length}`);

        // Also cross check by querying Institution passengers without vehicle filter  
        const { data: institutionAll } = await supabase
            .from('passengers')
            .select('id, vehicle_id, station_id, event_id, category')
            .eq('event_id', ev.id)
            .eq('category', 'Institution');
        console.log(`\nInstitution passengers for event (no vehicle filter): ${institutionAll?.length}`);
        if (institutionAll && institutionAll.length > 0) {
            // Check if their vehicle_ids match the ones we retrieved
            const matchedVehicleIds = institutionAll.filter(p => p.vehicle_id && vehicleIds.includes(p.vehicle_id));
            const unmatchedVehicleIds = institutionAll.filter(p => !p.vehicle_id || !vehicleIds.includes(p.vehicle_id));
            console.log(`Institution passengers whose vehicle_id matches a vehicle: ${matchedVehicleIds.length}`);
            console.log(`Institution passengers whose vehicle_id does NOT match: ${unmatchedVehicleIds.length}`);
            if (unmatchedVehicleIds.length > 0) {
                console.log("Sample unmatched institution passenger:", unmatchedVehicleIds[0]);
                // Check if their vehicle's station is even linked to this event
                const unmatchedVehicleIdList = unmatchedVehicleIds.filter(p => p.vehicle_id).map(p => p.vehicle_id);
                if (unmatchedVehicleIdList.length > 0) {
                    const { data: unmatchedVehicles } = await supabase
                        .from('vehicles')
                        .select('id, station_id, event_id')
                        .in('id', unmatchedVehicleIdList.slice(0, 10));
                    console.log("Their vehicles in DB:", JSON.stringify(unmatchedVehicles, null, 2));

                    // Check those vehicle station_ids
                    const unmatchedStationIds = unmatchedVehicles?.map(v => v.station_id).filter(Boolean) || [];
                    const { data: stationCheck } = await supabase
                        .from('pickup_stations')
                        .select('id, name, event_id')
                        .in('id', unmatchedStationIds);
                    console.log("Stations for those vehicles:", JSON.stringify(stationCheck, null, 2));
                }
            }
        }
    }
}

diagnose().catch(console.error);
