
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: 'passengers' });

    if (error) {
        console.error("Error retrieving schema:", error);
    } else {
        const hasStationId = data.some(col => col.column_name === 'station_id');
        console.log(`Has station_id: ${hasStationId}`);
        if (hasStationId) {
            const col = data.find(col => col.column_name === 'station_id');
            console.log("Column details:", col);
        }
    }
}

checkSchema();
