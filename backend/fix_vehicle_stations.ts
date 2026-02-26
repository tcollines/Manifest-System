
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function migrateVehicles() {
    console.log("Starting Vehicle Migration...");

    // 1. Add event_id column if not exists (This usually requires SQL, but we can't run DDL via JS client easily unless we use RPC or just hope it exists/we adding data)
    // Actually, we can't add columns via JS client without RPC. 
    // We will assume the user has run the SQL or we will use a raw query if possible?
    // Supabase JS client doesn't support DDL. 
    // We will skip DDL and assume we are just Populating. 
    // "Add event_id column to vehicles table (if not exists)" -> This is a task for the USER or SQL Editor.
    // BUT we can try to update it. If it fails, we know it doesn't exist.

    // WAIT! The task said "create a migration script".
    // I should provide the SQL too?
    // I will output the SQL instruction.

    console.log("NOTE: Please ensure 'event_id' column exists in 'vehicles' table. Run this SQL in Supabase Dashboard if not:");
    console.log("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES ministry_events(id);");

    // 2. Identify Vehicles linked to "Night of Prayer" stations (specifically "S&S stage")
    // event_id for "Night of Prayer" = 'bde9329f-2746-40b1-b2eb-56f2fcf028ee'
    // event_id for "Men Gather IX" = 'f3976613-0887-4138-b2e1-63a8a5824cdd'

    const NIGHT_OF_PRAYER_ID = 'bde9329f-2746-40b1-b2eb-56f2fcf028ee';
    const MEN_GATHER_ID = 'f3976613-0887-4138-b2e1-63a8a5824cdd';

    // Get Stations for Night of Prayer
    const { data: nopStations } = await supabase.from('pickup_stations').select('id, name').eq('event_id', NIGHT_OF_PRAYER_ID);
    const nopStationIds = nopStations?.map(s => s.id) || [];

    // Get Stations for Men Gather (Target)
    const { data: mgStations } = await supabase.from('pickup_stations').select('id, name').eq('event_id', MEN_GATHER_ID);

    // Find "S and S stage" in Men Gather
    const targetStation = mgStations?.find(s => s.name.toLowerCase().includes('s and s') || s.name.toLowerCase().includes('s & s'));

    if (!targetStation) {
        console.error("Target Station (S & S) not found in Men Gather event. Creating map based on name...");
    } else {
        console.log(`Target Station found: ${targetStation.name} (${targetStation.id})`);
    }


    // 3. Move Vehicles
    // Fetch ALL vehicles
    const { data: vehicles } = await supabase.from('vehicles').select('*');

    if (vehicles) {
        let vehiclesMoved = 0;
        for (const v of vehicles) {
            let updates: any = {};

            // A. Fix Station if it's in Night of Prayer list
            if (nopStationIds.includes(v.station_id)) {
                // Find matching station name in MG
                const currentStation = nopStations?.find(s => s.id === v.station_id);
                if (currentStation) {
                    const match = mgStations?.find(s => s.name === currentStation.name);
                    if (match) {
                        console.log(`Moving Vehicle ${v.number_plate} from ${currentStation.name} (Old) to ${match.name} (New)`);
                        updates.station_id = match.id;
                    } else if (targetStation && currentStation.name.includes("S")) {
                        // Fallback for S&S specific case
                        console.log(`Moving Vehicle ${v.number_plate} from ${currentStation.name} (Old) to ${targetStation.name} (New) - Fallback`);
                        updates.station_id = targetStation.id;
                    }
                }
            }

            // B. Populate event_id (Attempt)
            // We blindly add event_id to updates. If the column doesn't exist, Supabase/PG might throw error on update.
            // But we can check if we are *scoping* this update.
            // Strategy: Try update with event_id. If it fails, fallback to just station_id.

            if (MEN_GATHER_ID && (updates.station_id || !v.event_id)) {
                // If we are moving it, or it has no event_id, try to set it.
                // But we can't easily "try-catch" a single update column in Supabase unless we know schema.
                // We will assume the user has run the SQL for event_id. 
                // If not, we will log a warning if the update fails and try again without event_id.
                updates.event_id = MEN_GATHER_ID;
            }

            // Apply Updates
            if (Object.keys(updates).length > 0) {
                const { error } = await supabase.from('vehicles').update(updates).eq('id', v.id);
                if (error) {
                    if (error.message.includes('column "event_id" does not exist') || error.code === '42703' || error.code === 'PGRST204') {
                        // Retry without event_id
                        delete updates.event_id;
                        if (Object.keys(updates).length > 0) {
                            const { error: retryError } = await supabase.from('vehicles').update(updates).eq('id', v.id);
                            if (retryError) console.error(`Failed to update vehicle ${v.number_plate} (Retry):`, retryError);
                            else {
                                console.log(`Updated Vehicle ${v.number_plate} (Station Only):`, updates);
                                vehiclesMoved++;
                            }
                        }
                    } else {
                        console.error(`Failed to update vehicle ${v.number_plate}:`, error);
                    }
                } else {
                    console.log(`Updated Vehicle ${v.number_plate}:`, updates);
                    vehiclesMoved++;
                }
            }
        }
        console.log(`Total Vehicles Moved/Updated: ${vehiclesMoved}`);
    }

    // 4. Move Logistics Users (Entrants/Coordinators) from Old Station to New Station
    console.log("Checking Users for Station Migration...");
    const { data: users } = await supabase.from('users').select('*').in('station_id', nopStationIds);
    if (users && users.length > 0) {
        console.log(`Found ${users.length} users in old Night of Prayer stations.`);
        for (const u of users) {
            const currentStation = nopStations?.find(s => s.id === u.station_id);
            if (currentStation) {
                const match = mgStations?.find(s => s.name === currentStation.name);
                const target = match || (currentStation.name.includes("S") ? targetStation : null); // Fallback to S&S if applicable

                if (target) {
                    console.log(`Moving User ${u.username} (${u.name}) from ${currentStation.name} to ${target.name}`);
                    const { error } = await supabase.from('users').update({ station_id: target.id }).eq('id', u.id);
                    if (error) console.error(`Failed to move user ${u.username}:`, error);
                    else console.log(`Successfully moved user ${u.username}`);
                } else {
                    console.log(`Skipping user ${u.username} - No matching new station found for ${currentStation.name}`);
                }
            }
        }
    } else {
        console.log("No users found in old stations.");
    }

    console.log("Migration Complete.");
}

migrateVehicles();
