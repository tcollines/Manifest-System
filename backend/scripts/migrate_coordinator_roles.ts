
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

async function migrateCoordinatorRoles() {
    console.log("Starting Coordinator Role Differentiator Migration...");

    // 1. Fetch all users with generic 'Coordinator' role
    const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, name, role, station_id')
        .eq('role', 'Coordinator');

    if (fetchError) {
        console.error("Error fetching coordinators:", fetchError);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No users found with generic 'Coordinator' role.");
        return;
    }

    console.log(`Found ${users.length} generic coordinators.`);

    let vehicleCoordCount = 0;
    let stageCoordCount = 0;

    for (const user of users) {
        let newRole = 'Vehicle Coordinator';

        if (user.station_id) {
            newRole = 'Stage Coordinator';
            stageCoordCount++;
        } else {
            vehicleCoordCount++;
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', user.id);

        if (updateError) {
            console.error(`Failed to update role for user ${user.name} (${user.id}):`, updateError.message);
        } else {
            console.log(`Updated ${user.name}: Coordinator -> ${newRole}`);
        }
    }

    console.log("\nMigration Summary:");
    console.log(`- Vehicle Coordinators: ${vehicleCoordCount}`);
    console.log(`- Stage Coordinators: ${stageCoordCount}`);
    console.log(`- Total Updated: ${vehicleCoordCount + stageCoordCount}`);
}

migrateCoordinatorRoles().catch(err => {
    console.error("Migration fatal error:", err);
    process.exit(1);
});
