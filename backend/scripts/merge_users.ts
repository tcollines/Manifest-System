
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

async function mergeDuplicateUsers() {
    console.log("Detecting and merging duplicate users...");

    // 1. Fetch all users
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*');

    if (userError) {
        console.error("Error fetching users:", userError);
        return;
    }

    const userMap = new Map<string, any[]>();
    users.forEach(u => {
        const nameKey = u.name.trim().toLowerCase();
        if (!userMap.has(nameKey)) userMap.set(nameKey, []);
        userMap.get(nameKey)!.push(u);
    });

    console.log(`Found ${userMap.size} unique user names among ${users.length} total records.`);

    for (const [name, dupes] of userMap.entries()) {
        if (dupes.length > 1) {
            console.log(`\nProcessing duplicates for: "${dupes[0].name}" (${dupes.length} users)`);

            // Heuristic: Prefer the one with an email or the one with a more specific role
            // Or just the first one. Let's pick the one with the HIGHEST ID or first encountered.
            // Actually, let's pick the one with a role that is NOT just 'Member' if possible.
            const primary = dupes.sort((a, b) => {
                if (a.email && !b.email) return -1;
                if (!a.email && b.email) return 1;
                if (a.role !== 'Member' && b.role === 'Member') return -1;
                if (a.role === 'Member' && b.role !== 'Member') return 1;
                return 0;
            })[0];

            console.log(`- Primary User: ${primary.id} (Role: ${primary.role}, Name: ${primary.name})`);

            const toRemove = dupes.filter(d => d.id !== primary.id);

            for (const dupe of toRemove) {
                console.log(`  - Merging dupe: ${dupe.id} (Role: ${dupe.role}) into primary`);

                // Update vehicles
                const { error: vError } = await supabase
                    .from('vehicles')
                    .update({ coordinator_uid: primary.id })
                    .eq('coordinator_uid', dupe.id);

                if (vError) console.error(`    Error updating vehicles for ${dupe.id}:`, vError.message);

                // Update passengers? Usually they link to vehicle_id, not coordinator_uid directly.

                // Delete the dupe user
                const { error: dError } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', dupe.id);

                if (dError) console.error(`    Error deleting dupe user ${dupe.id}:`, dError.message);
            }
        }
    }

    // 2. Also fix vehicles where coordinator name matches but UID is null
    console.log("\nFixing vehicles with missing coordinator_uid...");
    const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .is('coordinator_uid', null);

    if (vehicleError) {
        console.error("Error fetching vehicles:", vehicleError);
        return;
    }

    console.log(`Found ${vehicles?.length || 0} vehicles with null coordinator_uid.`);

    for (const v of (vehicles || [])) {
        if (!v.coordinator) continue;

        const matchingUser = users.find(u => u.name.trim().toLowerCase() === v.coordinator.trim().toLowerCase());
        if (matchingUser) {
            console.log(`- Updating vehicle ${v.number_plate}: Setting coordinator_uid to ${matchingUser.id} (${matchingUser.name})`);
            await supabase
                .from('vehicles')
                .update({ coordinator_uid: matchingUser.id })
                .eq('id', v.id);
        }
    }

    console.log("\nCleanup Complete.");
}

mergeDuplicateUsers().catch(console.error);
