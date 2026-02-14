
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFinanceLogic() {
    console.log('--- DEBUGGING FINANCE DASHBOARD LOGIC ---');

    const eventName = "MEN GATHER IX"; // From screenshot
    // 1. Find Event
    const { data: events, error: eventError } = await supabase
        .from('ministry_events')
        .select('*')
        .ilike('title', `%${eventName}%`);

    if (eventError) { console.error("Error fetching event:", eventError.message); return; }
    if (!events || events.length === 0) { console.log(`No event found matching '${eventName}'`); return; }

    const event = events[0];
    console.log(`Found Event: ${event.title} (ID: ${event.id}, LegacyID: ${event.legacy_id})`);

    // 2. Find Stations for this Event
    // Logic: s.eventId === event.id OR s.legacy_event_id === event.id
    const { data: stations, error: stationError } = await supabase
        .from('pickup_stations')
        .select('id, name, event_id, legacy_event_id');
    // .eq('event_id', event.id); // Try exact match first

    if (stationError) { console.error("Error fetching stations:", stationError.message); return; }

    // Simulate frontend filter: s.eventId === selectedFleetEvent.id
    // Note: Frontend likely compares UUIDs if migrated, or Text if not.
    // The previous finding showed `pickup_stations` has `event_id` (UUID) and `legacy_event_id`.

    // Let's filter in memory to see what matches what
    const matchedStations = stations?.filter(s =>
        s.event_id === event.id ||
        s.legacy_event_id === event.id ||
        s.event_id === event.legacy_id // Unlikely but possible
    );

    console.log(`Total Stations in DB: ${stations?.length}`);
    console.log(`Stations matching Event ID (${event.id}): ${matchedStations?.length}`);

    if (matchedStations?.length === 0) {
        console.warn("⚠️ No stations found for this event! This explains why vehicles are missing.");
        return;
    }

    const stationIds = matchedStations?.map(s => s.id);
    console.log("Matched Station IDs:", stationIds);

    // 3. Find Vehicles in these Stations
    // DEBUG: Specific Check for UBR 121S
    const { data: specificVehicle } = await supabase
        .from('vehicles')
        .select('*')
        .eq('number_plate', 'UBR 121S')
        .single();

    console.log("Specific Vehicle UBR 121S:", specificVehicle);

    const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, number_plate, station_id, status, event_id, legacy_event_id')
        .in('station_id', stationIds || []);

    if (vehicleError) { console.error("Error fetching vehicles:", vehicleError.message); return; }

    console.log(`Vehicles found in these stations: ${vehicles?.length}`);
    if (vehicles && vehicles.length > 0) {
        console.log("Sample Vehicle:", vehicles[0]);
    } else {
        console.warn("⚠️ Stations exist, but no vehicles are linked to them.");
    }
}

debugFinanceLogic();
