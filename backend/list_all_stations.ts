
import { supabase } from './src/supabase';

async function listAllStations() {
    console.log("Listing all pickup stations...");
    const { data: stations, error } = await supabase
        .from('pickup_stations')
        .select('*');

    if (error) {
        console.error("Error fetching stations:", error);
    } else {
        console.log(`Found ${stations?.length} stations.`);
        if (stations && stations.length > 0) {
            console.log(stations);
        }
    }
}

listAllStations();
