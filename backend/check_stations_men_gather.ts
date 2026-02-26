
import { supabase } from './src/supabase';

async function checkStations() {
    console.log("Checking events...");
    const { data: events, error: eventError } = await supabase
        .from('ministry_events')
        .select('id, title')
        .ilike('title', '%MEN GATHER IX%');

    if (eventError) {
        console.error("Error fetching events:", eventError);
        return;
    }

    console.log("Found events:", events);

    if (events && events.length > 0) {
        const eventId = events[0].id;
        console.log(`Checking stations for event ${eventId} (${events[0].title})...`);
        const { data: stations, error: stationError } = await supabase
            .from('pickup_stations')
            .select('*')
            .eq('event_id', eventId);

        if (stationError) {
            console.error("Error fetching stations:", stationError);
        } else {
            console.log("Stations found:", stations);
        }
    } else {
        console.log("No event found matching 'MEN GATHER IX'");
    }
}

checkStations();
