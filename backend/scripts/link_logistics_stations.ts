
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function linkLogisticsStations() {
    console.log('--- LINKING LOGISTICS USERS TO STATIONS ---');

    // 1. Fetch Logistics Users
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'Logistics')
        .is('station_id', null); // Only those missing station_id

    if (userError) { console.error("Error fetching users:", userError.message); return; }
    if (!users || users.length === 0) { console.log("No orphaned Logistics users found."); return; }

    console.log(`Found ${users.length} orphaned Logistics users.`);

    // 2. Fetch All Stations
    const { data: stations, error: stationError } = await supabase
        .from('pickup_stations')
        .select('id, name, data_entrant_name');

    if (stationError) { console.error("Error fetching stations:", stationError.message); return; }

    let updatedCount = 0;

    for (const u of users) {
        // Try to match by name (Case Insensitive)
        // pickup_stations.data_entrant_name vs users.name

        if (!u.name) continue;

        const normalize = (s: string) => s.toLowerCase().trim();
        const userName = normalize(u.name);

        const match = stations.find(s => s.data_entrant_name && normalize(s.data_entrant_name) === userName);

        if (match) {
            console.log(`✅ MATCH: User '${u.name}' matches Station '${match.name}' (ID: ${match.id})`);

            const { error: updateError } = await supabase
                .from('users')
                .update({ station_id: match.id })
                .eq('id', u.id);

            if (updateError) {
                console.error(`   ❌ Failed to update user: ${updateError.message}`);
            } else {
                updatedCount++;
            }
        } else {
            console.warn(`⚠️ NO MATCH: User '${u.name}' could not be linked to any station by name.`);
        }
    }

    console.log(`--- SUMMARY ---`);
    console.log(`Total Orphans: ${users.length}`);
    console.log(`Successfully Linked: ${updatedCount}`);
}

linkLogisticsStations();
