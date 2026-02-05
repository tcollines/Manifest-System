
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Helper to get env vars (assuming locally available or printed)
// NOTE: For this script to run, .env must be in backend root.
const url = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const key = process.env.SUPABASE_ANON_KEY || 'YOUR_KEY_HERE';

if (!process.env.SUPABASE_URL) {
    console.log("No .env found, attempting to assume logic integrity...");
    // Just a placeholder if we can't actually connect
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkIntegrity() {
    console.log("--- DATA INTEGRITY AUDIT ---");

    // 1. Get All Events
    const { data: events, error: eErr } = await supabase.from('events').select('id, title');
    if (eErr) { console.error("Error fetching events:", eErr); return; }

    console.log(`Found ${events.length} Events.`);

    // 2. Check Stations per Event
    const { data: stations, error: sErr } = await supabase.from('pickup_stations').select('id, event_id');
    if (sErr) { console.error("Error fetching stations:", sErr); return; }

    const stationsByEvent = {};
    stations.forEach(s => {
        const eid = s.event_id || 'NULL';
        stationsByEvent[eid] = (stationsByEvent[eid] || 0) + 1;
    });

    // 3. Check Vehicles per Station (and thus per Event)
    const { data: vehicles, error: vErr } = await supabase.from('vehicles').select('id, station_id, coordinator');
    if (vErr) { console.error("Error fetching vehicles:", vErr); return; }

    const vehiclesByStation = {};
    vehicles.forEach(v => {
        const sid = v.station_id || 'NULL';
        vehiclesByStation[sid] = (vehiclesByStation[sid] || 0) + 1;
    });

    // Aggregating Vehicles by Event
    const vehiclesByEvent = {};
    stations.forEach(s => {
        const count = vehiclesByStation[s.id] || 0;
        const eid = s.event_id || 'NULL';
        vehiclesByEvent[eid] = (vehiclesByEvent[eid] || 0) + count;
    });
    // Add vehicles with NULL stations
    vehiclesByEvent['Orphaned (No Station)'] = vehiclesByStation['NULL'] || 0;


    // REPORT
    console.table(events.map(e => ({
        Event: e.title,
        ID: e.id,
        Stations: stationsByEvent[e.id] || 0,
        Vehicles: vehiclesByEvent[e.id] || 0
    })));

    console.log("--- Unlinked Data ---");
    console.log("Stations with NULL event_id:", stationsByEvent['NULL'] || 0);
    console.log("Vehicles with NULL station_id:", vehiclesByEvent['Orphaned (No Station)'] || 0);
}

checkIntegrity();
