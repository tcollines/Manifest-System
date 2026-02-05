
import { supabase } from './src/supabase';
import * as dotenv from 'dotenv';
dotenv.config();

const INTER_SCHOOLS_UUID = '11324002-c401-494b-be68-179650967970';
const NIGHT_OF_PRAYER_UUID = 'bde9329f-2746-40b1-b2eb-56f2fcf028ee';

async function findCords() {
    const events = [
        { id: INTER_SCHOOLS_UUID, name: 'Interschools' },
        { id: NIGHT_OF_PRAYER_UUID, name: 'Night Of Prayer' }
    ];

    for (const event of events) {
        console.log(`\n--- Event: ${event.name} (${event.id}) ---`);

        // 1. Get stations for this event
        const { data: stations, error: sErr } = await supabase
            .from('pickup_stations')
            .select('id, name')
            .eq('event_id', event.id);

        if (sErr) {
            console.error(`Error fetching stations for ${event.name}:`, sErr.message);
            continue;
        }

        const stationIds = stations.map(s => s.id);
        console.log(`Stations found: ${stations.length}`);

        if (stationIds.length === 0) continue;

        // 2. Get unique coordinators for these stations
        const { data: vehicles, error: vErr } = await supabase
            .from('vehicles')
            .select('coordinator, station_id')
            .in('station_id', stationIds);

        if (vErr) {
            console.error(`Error fetching vehicles for stations:`, vErr.message);
            continue;
        }

        const coords = [...new Set(vehicles.map(v => v.coordinator?.trim()).filter(Boolean))];
        console.log(`Coordinators identified: ${coords.length}`);
        coords.forEach(c => console.log(` - ${c}`));
    }
}

findCords();
