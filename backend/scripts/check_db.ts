import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkDb() {
    console.log("Checking DB events...");
    const { data: events } = await supabase.from('ministry_events').select('id, title').ilike('title', '%MEN GATHER%');
    console.log("Events:", events);

    if (!events || events.length === 0) return;

    for (const ev of events) {
        console.log(`\n--- Event: ${ev.title} (${ev.id}) ---`);

        // Passengers
        const { data: passengers } = await supabase.from('passengers').select('id, category, soul_won, is_first_time').eq('event_id', ev.id);
        console.log(`Passengers count: ${passengers?.length || 0}`);

        if (passengers && passengers.length > 0) {
            const categoriesContent = passengers.reduce((acc, p) => {
                acc[p.category] = (acc[p.category] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            console.log(`Passenger Categories:`, categoriesContent);

            const soulWonCount = passengers.filter(p => p.soul_won).length;
            console.log(`Passengers marked as soul_won: ${soulWonCount}`);

            const firstTimeCount = passengers.filter(p => p.is_first_time === 'Yes' || p.is_first_time === true).length;
            console.log(`Passengers marked as first time: ${firstTimeCount}`);
        }

        // Souls
        const { data: souls } = await supabase.from('souls').select('id, source_type').eq('event_id', ev.id);
        console.log(`\nSouls count: ${souls?.length || 0}`);

        // Pickup Stations
        const { data: stations } = await supabase.from('pickup_stations').select('id').eq('event_id', ev.id);
        console.log(`\nPickup Stations count: ${stations?.length || 0}`);

        // Vehicles
        const { data: vehicles } = await supabase.from('vehicles').select('id').eq('event_id', ev.id);
        console.log(`Vehicles count: ${vehicles?.length || 0}`);

        if (stations && stations.length > 0) {
            const { data: veh_stations } = await supabase.from('vehicles').select('id').in('station_id', stations.map(s => s.id));
            console.log(`Vehicles linked to these stations: ${veh_stations?.length || 0}`);

            if (veh_stations && veh_stations.length > 0) {
                const vehicleIds = veh_stations.map(v => v.id);
                const { data: campusPassengers } = await supabase.from('passengers').select('id').eq('event_id', ev.id).eq('category', 'Institution').in('vehicle_id', vehicleIds);
                console.log(`Institution passengers correctly linked to vehicles: ${campusPassengers?.length || 0}`);

                const { data: campusAll } = await supabase.from('passengers').select('id, vehicle_id').eq('event_id', ev.id).eq('category', 'Institution');
                console.log(`Institution passengers total for event: ${campusAll?.length || 0}`);
            }
        }
    }
}


checkDb().catch(console.error);
