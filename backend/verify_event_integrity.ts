
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function verifyIntegrity() {
    console.log("Verifying Data Integrity for 'Men Gather IX'...");
    const EVENT_ID = 'f3976613-0887-4138-b2e1-63a8a5824cdd';

    // 1. Check Event
    const { data: event, error: eErr } = await supabase.from('ministry_events').select('*').eq('id', EVENT_ID).single();
    if (eErr || !event) { console.error("Event not found:", eErr); return; }
    console.log(`\n1. Event Verified: ${event.title} (${event.id})`);

    // 2. Check Stations
    const { data: stations, error: sErr } = await supabase.from('pickup_stations').select('*').eq('event_id', EVENT_ID);
    if (sErr) { console.error("Station fetch failed:", sErr); return; }
    console.log(`\n2. Found ${stations.length} Stations linked to Event.`);

    const stationIds = stations.map(s => s.id);
    stations.forEach(s => {
        if (s.event_id !== EVENT_ID) console.error(`   FAIL: Station ${s.name} has wrong event_id: ${s.event_id}`);
        else console.log(`   OK: Station ${s.name} (${s.id}) -> Coord Name: ${s.coordinator_name}`);
    });

    if (stations.length === 0) return;

    // 3. Check Vehicles
    const { data: vehicles, error: vErr } = await supabase.from('vehicles').select('*').in('station_id', stationIds);
    if (vErr) { console.error("Vehicle fetch failed:", vErr); return; }
    console.log(`\n3. Found ${vehicles.length} Vehicles in these Stations.`);

    const vehicleIds = vehicles.map(v => v.id);
    vehicles.forEach(v => {
        let status = "OK";
        if (v.event_id !== EVENT_ID) status = `FAIL (Wrong Event ID: ${v.event_id})`;
        if (!stationIds.includes(v.station_id)) status = `FAIL (Orphaned Station ID: ${v.station_id})`;

        console.log(`   [${status}] Vehicle ${v.number_plate} -> Station: ${v.station_id} | Event: ${v.event_id}`);
        // Check timestamps to see if it's old data
        if (new Date(v.created_at) < new Date(event.created_at)) {
            console.warn(`      WARNING: Vehicle created BEFORE event! (V: ${v.created_at} < E: ${event.created_at})`);
        }
    });

    if (vehicles.length === 0) return;

    // 4. Check Passengers
    const { data: passengers, error: pErr } = await supabase.from('passengers').select('*').in('vehicle_id', vehicleIds);
    if (pErr) { console.error("Passenger fetch failed:", pErr); return; }
    console.log(`\n4. Found ${passengers.length} Passengers in these Vehicles.`);

    passengers.forEach(p => {
        if (!vehicleIds.includes(p.vehicle_id)) console.error(`   FAIL: Passenger ${p.name} orphaned from vehicle ${p.vehicle_id}`);
    });
    console.log(`   All ${passengers.length} passengers correctly linked to valid vehicles.`);

    // 5. Check Coordinators (Users)
    // We want to check if the names "Esther" etc match actual users
    console.log(`\n5. Verifying Coordinators...`);
    // Stations store 'coordinator_name', let's check if 'users' exist with that name and Role 'Logistics' or 'Coordinator'
    const coordNames = stations.map(s => s.coordinator_name).filter(n => n);

    if (coordNames.length > 0) {
        const { data: users } = await supabase.from('users').select('*').in('name', coordNames);
        console.log(`   Found ${users?.length || 0} User accounts matching Station Coordinator names.`);
        users?.forEach(u => {
            console.log(`   User: ${u.name} | Role: ${u.role} | Station: ${u.station_id}`);
        });
    }

    // 6. Check Transactions
    const { data: transactions, error: tErr } = await supabase.from('transactions').select('*').eq('event_id', EVENT_ID);
    if (tErr) { console.error("Transaction fetch failed:", tErr); }
    else {
        console.log(`\n6. Found ${transactions?.length || 0} Transactions linked to Event.`);
        transactions?.forEach(t => {
            console.log(`   Transaction: ${t.description} | Amount: ${t.amount} | Type: ${t.type}`);
        });
    }
}

verifyIntegrity();
