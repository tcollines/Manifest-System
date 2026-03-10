import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function backfillPassengerStations() {
    console.log("Fetching passengers with missing station_id...");

    const { data: passengers, error: pError } = await supabase
        .from('passengers')
        .select('id, vehicle_id, station_id')
        .is('station_id', null);

    if (pError) {
        console.error("Error fetching passengers:", pError);
        return;
    }

    if (!passengers || passengers.length === 0) {
        console.log("No passengers missing station_id.");
        return;
    }

    console.log(`Found ${passengers.length} passengers missing station_id.`);

    // Get unique vehicle IDs
    const vehicleIds = [...new Set(passengers.map(p => p.vehicle_id).filter(Boolean))];
    console.log(`Associated with ${vehicleIds.length} unique vehicles.`);

    if (vehicleIds.length === 0) {
        console.log("No associated vehicle IDs found.");
        return;
    }

    // Fetch vehicles to get their station_ids
    const { data: vehicles, error: vError } = await supabase
        .from('vehicles')
        .select('id, station_id, event_id')
        .in('id', vehicleIds);

    if (vError) {
        console.error("Error fetching vehicles:", vError);
        return;
    }

    const vehicleMap = new Map(vehicles.map(v => [v.id, { station_id: v.station_id, event_id: v.event_id }]));

    let updatedCount = 0;
    let errorCount = 0;

    for (const p of passengers) {
        if (!p.vehicle_id) continue;

        const vehicleInfo = vehicleMap.get(p.vehicle_id);
        if (vehicleInfo && vehicleInfo.station_id) {
            const { error: updateError } = await supabase
                .from('passengers')
                .update({
                    station_id: vehicleInfo.station_id,
                    event_id: vehicleInfo.event_id // also backfill event_id just in case
                })
                .eq('id', p.id);

            if (updateError) {
                console.error(`Error updating passenger ${p.id}:`, updateError);
                errorCount++;
            } else {
                updatedCount++;
                if (updatedCount % 50 === 0) {
                    console.log(`Updated ${updatedCount} passengers...`);
                }
            }
        }
    }

    console.log(`Finished! Successfully updated ${updatedCount} passengers. Errors: ${errorCount}`);
}

backfillPassengerStations();
