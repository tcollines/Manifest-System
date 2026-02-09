
import { supabase } from './src/supabase';

async function testInsert() {
    console.log("Testing insert with non-UUID ID...");
    const { data: events } = await supabase.from('ministry_events').select('id').limit(1);
    if (!events || events.length === 0) {
        console.log("No events found to link to.");
        return;
    }
    const eventId = events[0].id;

    const { error } = await supabase.from('pickup_stations').insert([{
        id: `s-${Date.now()}`,
        name: 'Test Station',
        location: 'Test Location',
        event_id: eventId
    }]);

    if (error) {
        console.error("Insert failed:", error);
    } else {
        console.log("Insert succeeded!");
    }
}

testInsert();
