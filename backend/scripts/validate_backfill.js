
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function validate() {
    const { count, error } = await supabase
        .from('passengers')
        .select('*', { count: 'exact', head: true })
        .is('station_id', null)
        .not('vehicle_id', 'is', null);

    if (error) {
        console.error("Validation error:", error);
    } else {
        console.log(`Remaining passengers with NULL station_id (but valid vehicle_id): ${count}`);
    }
}
validate();
