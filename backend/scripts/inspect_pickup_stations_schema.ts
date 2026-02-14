
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPickupStations() {
    console.log('--- INSPECTING PICKUP STATIONS ---');

    // Fetch random station to see columns
    const { data: stations, error } = await supabase
        .from('pickup_stations')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching stations:", error.message);
        return;
    }

    if (!stations || stations.length === 0) {
        console.log("No pickup stations found.");
        return;
    }

    const station = stations[0];
    console.log("Sample Station Keys:", Object.keys(station));

    // Check for entrant related fields
    const entrantFields = Object.keys(station).filter(k => k.toLowerCase().includes('entrant'));
    console.log("Entrant Related Fields:", entrantFields);

    console.log("Sample Station:", JSON.stringify(station, null, 2));
}

inspectPickupStations();
