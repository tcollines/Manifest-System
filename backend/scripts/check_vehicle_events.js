
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOrphanedVehicles() {
    const { count, error } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .is('event_id', null);

    if (error) {
        console.error("Error checking vehicles:", error);
    } else {
        console.log(`Vehicles with NULL event_id: ${count}`);
    }

    // Check distinct event_ids
    const { data: vehicles } = await supabase.from('vehicles').select('id, event_id, legacy_event_id').limit(5);
    console.log("Sample Vehicles:", vehicles);
}

checkOrphanedVehicles();
