
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { v4: uuidv4 } = require('uuid');
const util = require('util');

async function debugPassengerInsert() {
    // 1. Get a valid vehicle and event
    const { data: vehicles } = await supabase.from('vehicles').select('id, event_id').limit(1);

    if (!vehicles || vehicles.length === 0) {
        console.log("No vehicles found to test.");
        return;
    }

    const vehicle = vehicles[0];
    const passengerId = uuidv4();

    console.log(`Testing Insert for Vehicle: ${vehicle.id}, Event: ${vehicle.event_id}`);

    const payload = {
        id: passengerId,
        vehicle_id: vehicle.id,
        event_id: vehicle.event_id,
        name: 'Debug User',
        contact: '0000000000',
        residence: 'Debug Lane',
        gender: 'Male',
        is_first_time: 'No',
        legacy_id: passengerId,
        legacy_vehicle_id: vehicle.id,
        legacy_event_id: vehicle.event_id,
        category: 'Member',
        soul_won: false
    };

    console.log("PAYLOAD:", payload);


    try {
        const { data, error } = await supabase.from('passengers').insert([payload]).select();

        if (error) {
            console.error("INSERT FAILED:", util.inspect(error, { showHidden: false, depth: null, colors: true }));
        } else {
            console.log("INSERT SUCCESS:", util.inspect(data, { showHidden: false, depth: null, colors: true }));
            // Cleanup
            await supabase.from('passengers').delete().eq('id', passengerId);
        }
    } catch (e) {
        console.error("SCRIPT ERROR:", e);
    }
}

debugPassengerInsert();
