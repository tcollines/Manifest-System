import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function findMenGatherEvent() {
    console.log("Searching for Men Gather events...");

    // Check events table
    const { data: events, error: eError } = await supabase
        .from('ministry_events')
        .select('*')
        .ilike('title', '%Men Gather%');

    if (eError) {
        console.error("Error fetching events:", eError);
        return;
    }

    console.log(`Found ${events?.length} Men Gather events:`);
    for (const ev of events || []) {
        console.log(`- ID: ${ev.id}, Title: ${ev.title}, Date: ${ev.date}`);

        // Count vehicles for this event
        const { count: vCount } = await supabase
            .from('vehicles')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', ev.id);

        // Count vehicles missing station_id
        const { count: vMissingCount } = await supabase
            .from('vehicles')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', ev.id)
            .is('station_id', null);

        console.log(`  Vehicles: ${vCount}, Missing station_id: ${vMissingCount}`);

        // Count passengers
        const { count: pCount } = await supabase
            .from('passengers')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', ev.id);

        // Count passengers missing station_id
        const { count: pMissingCount } = await supabase
            .from('passengers')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', ev.id)
            .is('station_id', null);

        console.log(`  Passengers: ${pCount}, Missing station_id: ${pMissingCount}`);
    }

    // Let's also check for total vehicles and passengers with no station_id just in case
    const { count: totalVMissing } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).is('station_id', null);
    console.log(`Total Vehicles missing station_id: ${totalVMissing}`);

    const { count: totalPMissing } = await supabase.from('passengers').select('*', { count: 'exact', head: true }).is('station_id', null);
    console.log(`Total Passengers missing station_id: ${totalPMissing}`);
}

findMenGatherEvent();
