
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listVehicles() {
    console.log("Listing all vehicles...");
    const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('*');

    if (error) {
        console.error("Error fetching vehicles:", error);
        return;
    }

    if (!vehicles || vehicles.length === 0) {
        console.log("No vehicles found.");
    } else {
        console.log(`Found ${vehicles.length} vehicles:`);
        vehicles.forEach(v => {
            console.log(`- [${v.id}] Plate: ${v.number_plate}, EventID: ${v.event_id}, Status: ${v.status}, Coord: ${v.coordinator_name} (ID: ${v.coordinator_id}), Station: ${v.station_id}`);
        });
    }
}

listVehicles();
