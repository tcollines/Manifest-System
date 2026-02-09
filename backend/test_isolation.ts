
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function testIsolation() {
    console.log("Testing Event Isolation...");

    // 1. Create Event A
    const { data: eventA } = await supabase.from('ministry_events').insert({
        title: 'Event A', date: '2025-01-01', type: 'Event', status: 'Upcoming'
    }).select().single();
    if (!eventA) throw new Error("Failed to create Event A");

    // 2. Create Station A
    const { data: stationA } = await supabase.from('pickup_stations').insert({
        name: 'Shared Name Station', event_id: eventA.id
    }).select().single();

    // 3. Add Vehicle to Station A (Event A)
    const { data: vehicleA } = await supabase.from('vehicles').insert({
        number_plate: 'ISO-001',
        station_id: stationA.id,
        event_id: eventA.id, // Correctly linked
        current_stage: 'Onboarding',
        driver_name: 'Driver A',
        type: 'Car',
        driver_contact: '0700'
    }).select().single();
    console.log(`Created Vehicle ${vehicleA.number_plate} in Event A (Station ${stationA.id})`);

    // 4. Create Event B
    const { data: eventB } = await supabase.from('ministry_events').insert({
        title: 'Event B', date: '2025-01-02', type: 'Event', status: 'Upcoming'
    }).select().single();

    // 5. Create Station B (Same Name)
    const { data: stationB } = await supabase.from('pickup_stations').insert({
        name: 'Shared Name Station', event_id: eventB.id
    }).select().single();
    if (!stationB) throw new Error("Failed to create Station B");

    console.log(`Created Station B (${stationB.id}) in Event B`);

    // 6. Fetch Vehicles for Event B using the logic from vehicleController
    // Logic: fetch stations for Event B, then vehicles in those stations
    const { data: bStations } = await supabase.from('pickup_stations').select('id').eq('event_id', eventB.id);
    const bStationIds = bStations?.map(s => s.id) || [];

    let vehiclesB: any[] = [];
    if (bStationIds.length > 0) {
        const { data } = await supabase.from('vehicles').select('*').in('station_id', bStationIds);
        vehiclesB = data || [];
    }

    console.log(`Vehicles found in Event B: ${vehiclesB.length}`);
    if (vehiclesB.length > 0) {
        console.error("FAIL: Leakage detected!", vehiclesB);
    } else {
        console.log("PASS: No leakage. Event B is clean.");
    }

    // Cleanup
    await supabase.from('vehicles').delete().eq('id', vehicleA.id);
    await supabase.from('pickup_stations').delete().in('id', [stationA.id, stationB.id]);
    await supabase.from('ministry_events').delete().in('id', [eventA.id, eventB.id]);
}

testIsolation();
