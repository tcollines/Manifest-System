
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStations() {
    console.log("Fetching pickup stations...");
    const { data: stations, error } = await supabase.from('pickup_stations').select('*');
    if (error) {
        console.error("Error fetching stations:", error);
        return;
    }

    console.log(`Found ${stations.length} stations:`);
    stations.forEach(s => {
        console.log(`- Station: ${s.name}, ID: ${s.id}, CoordinatorID: ${s.coordinator_id || 'N/A'}, DataEntrantID: ${s.data_entrant_id || 'N/A'}`);
    });
}

checkStations().catch(console.error);
