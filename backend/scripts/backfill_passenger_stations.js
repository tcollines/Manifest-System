
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function backfill() {
    console.log("Starting backfill of passenger station_ids (JS)...");

    // 1. Fetch passengers with missing station_id
    // We get vehicle_id to lookup the station
    // Note: is('station_id', null) might be syntax specific, let's use check
    const { data: passengers, error: pError } = await supabase
        .from('passengers')
        .select('id, vehicle_id')
        .is('station_id', null)
        .not('vehicle_id', 'is', null);

    if (pError) {
        console.error("Error fetching passengers:", pError);
        return;
    }

    if (!passengers || passengers.length === 0) {
        console.log("No passengers found needing backfill.");
        return;
    }

    console.log(`Found ${passengers.length} passengers to update.`);

    // 2. Fetch distinct vehicle IDs from this set
    const vehicleIds = [...new Set(passengers.map(p => p.vehicle_id))];

    // 3. Fetch those vehicles to get their station_id
    const { data: vehicles, error: vError } = await supabase
        .from('vehicles')
        .select('id, station_id, legacy_station_id')
        .in('id', vehicleIds);

    if (vError) {
        console.error("Error fetching vehicles:", vError);
        return;
    }

    const vehicleMap = new Map();
    vehicles.forEach(v => {
        vehicleMap.set(v.id, v);
    });

    // 4. Update passengers in batches
    let updatedCount = 0;
    let errorCount = 0;

    // Parallel limit
    const BATCH_SIZE = 50;
    for (let i = 0; i < passengers.length; i += BATCH_SIZE) {
        const chunk = passengers.slice(i, i + BATCH_SIZE);
        const updates = chunk.map(async (p) => {
            const vehicle = vehicleMap.get(p.vehicle_id);
            if (!vehicle) {
                // console.warn(`Passenger ${p.id} has vehicle ${p.vehicle_id} not found.`);
                return;
            }
            if (!vehicle.station_id) {
                return;
            }

            const { error: uError } = await supabase
                .from('passengers')
                .update({
                    station_id: vehicle.station_id,
                    legacy_station_id: vehicle.legacy_station_id
                })
                .eq('id', p.id);

            if (uError) {
                console.error(`Failed to update passenger ${p.id}:`, uError);
                errorCount++;
            } else {
                // console.log(`Updated passenger ${p.id}`);
                updatedCount++;
            }
        });

        await Promise.all(updates);
        console.log(`Processed ${Math.min(i + BATCH_SIZE, passengers.length)}/${passengers.length}`);
    }

    console.log(`Backfill Complete. Updated: ${updatedCount}, Errors: ${errorCount}`);
}

backfill();
