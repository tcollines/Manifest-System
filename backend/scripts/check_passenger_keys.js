
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkKeys() {
    const { data, error } = await supabase
        .from('passengers')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error retrieving data:", error);
    } else if (data && data.length > 0) {
        const keys = Object.keys(data[0]);
        console.log("Passenger Keys:", keys);
        console.log("Has station_id:", keys.includes('station_id'));
    } else {
        console.log("No passengers found to check keys. Using RPC fallback if possible or assuming missing if table exists.");
    }
}

checkKeys();
