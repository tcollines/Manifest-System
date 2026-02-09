
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkLogisticsUsers() {
    console.log("Fetching Logistics Users...");

    // Get Users
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, name, username, role, station_id')
        .eq('role', 'Logistics');

    if (userError) {
        console.error("Error fetching users:", userError);
        return;
    }

    // Get Stations
    const { data: stations, error: stationError } = await supabase
        .from('pickup_stations')
        .select('id, name, event_id');

    if (stationError) {
        console.error("Error fetching stations:", stationError);
        return;
    }

    // Get Events
    const { data: events, error: eventError } = await supabase
        .from('ministry_events')
        .select('id, title');

    if (eventError) {
        console.error("Error fetching events:", eventError);
        return;
    }

    const stationMap = new Map(stations?.map(s => [s.id, s]));
    const eventMap = new Map(events?.map(e => [e.id, e]));

    console.log(`Found ${users?.length} logistics users.`);

    users?.forEach(u => {
        const station = stationMap.get(u.station_id);
        const event = station ? eventMap.get(station.event_id) : null;

        console.log(`User: ${u.name} (@${u.username})`);
        console.log(`  - Linked Station ID: ${u.station_id}`);
        console.log(`  - Station Name: ${station ? station.name : "UNKNOWN/NULL"}`);
        console.log(`  - Event: ${event ? event.title : "N/A"} (${station?.event_id})`);
        console.log('---');
    });
}

checkLogisticsUsers();
