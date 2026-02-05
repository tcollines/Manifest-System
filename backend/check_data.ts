
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkIntegrity() {
    console.log("--- DATA INTEGRITY AUDIT ---");

    // 1. Get All Events
    const { data: events, error: eErr } = await supabase.from('events').select('id, title');
    if (eErr) { console.error("Error fetching events:", eErr); return; }

    console.log(`Found ${events?.length || 0} Events.`);

    // 2. Check Stations per Event
    const { data: stations, error: sErr } = await supabase.from('pickup_stations').select('id, event_id');
    if (sErr) { console.error("Error fetching stations:", sErr); return; }

    const stationsByEvent: Record<string, number> = {};
    stations?.forEach(s => {
        const eid = s.event_id || 'NULL';
        stationsByEvent[eid] = (stationsByEvent[eid] || 0) + 1;
    });

    // 3. Check Vehicles per Station (and thus per Event)
    const { data: vehicles, error: vErr } = await supabase.from('vehicles').select('id, station_id, coordinator');
    if (vErr) { console.error("Error fetching vehicles:", vErr); return; }

    const vehiclesByStation: Record<string, number> = {};
    vehicles?.forEach(v => {
        const sid = v.station_id || 'NULL';
        vehiclesByStation[sid] = (vehiclesByStation[sid] || 0) + 1;
    });

    // Aggregating Vehicles by Event
    const vehiclesByEvent: Record<string, number> = {};
    stations?.forEach(s => {
        const count = vehiclesByStation[s.id] || 0;
        const eid = s.event_id || 'NULL';
        vehiclesByEvent[eid] = (vehiclesByEvent[eid] || 0) + count;
    });
    // Add vehicles with NULL stations
    vehiclesByEvent['Orphaned (No Station)'] = vehiclesByStation['NULL'] || 0;


    // REPORT
    console.table(events?.map(e => ({
        Event: e.title,
        ID: e.id,
        Stations: stationsByEvent[e.id] || 0,
        Vehicles: vehiclesByEvent[e.id] || 0
    })));

    console.log("--- Unlinked Data ---");
    console.log(`Stations with NULL event_id: ${stationsByEvent['NULL'] || 0}`);
    console.log(`Vehicles with NULL station_id: ${vehiclesByStation['NULL'] || 0}`);
}

checkIntegrity();
