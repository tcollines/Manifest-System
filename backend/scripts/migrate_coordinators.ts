
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to generate a username from a name
const generateUsername = (name: string) => {
    return name.trim().replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
};

// Helper to generate a dummy password
const generatePassword = () => 'ChangeMe123!';

async function migrateCoordinators() {
    console.log("Starting Coordinator Migration (Name -> UID)...");

    // 1. Fetch all vehicles
    const { data: vehicles, error: vError } = await supabase
        .from('vehicles')
        .select('id, coordinator, coordinator_contact, event_id, coordinator_uid');

    if (vError) {
        console.error("Error fetching vehicles:", vError);
        return;
    }

    console.log(`Found ${vehicles?.length || 0} vehicles.`);

    // 2. Fetch all existing users to avoid duplicates
    const { data: users, error: uError } = await supabase
        .from('users')
        .select('id, name, contact');

    if (uError) {
        console.error("Error fetching users:", uError);
        return;
    }

    // Map Name -> User
    // Normalize names for comparison (lowercase, trimmed)
    const userMap = new Map<string, any>();
    users?.forEach(u => {
        if (u.name) userMap.set(u.name.toLowerCase().trim(), u);
    });

    let updatedCount = 0;
    let createdCount = 0;

    // 3. Iterate vehicles
    for (const vehicle of vehicles || []) {
        if (vehicle.coordinator_uid) {
            console.log(`Vehicle ${vehicle.id} already has UID. Skipping.`);
            continue;
        }

        const coordName = vehicle.coordinator;
        if (!coordName) {
            console.log(`Vehicle ${vehicle.id} has no coordinator name. Skipping.`);
            continue;
        }

        const normalizedName = coordName.toLowerCase().trim();
        let targetUserId: string | null = null;

        // A. Check if user exists
        if (userMap.has(normalizedName)) {
            const existingUser = userMap.get(normalizedName);
            targetUserId = existingUser.id;
            console.log(`Matched existing user for '${coordName}': ${existingUser.name}`);
        } else {
            // B. Create New User
            console.log(`Creating new user for '${coordName}'...`);
            const newUserData = {
                id: uuidv4(),
                name: coordName,
                role: 'Coordinator',
                username: generateUsername(coordName),
                password: generatePassword(),
                contact: vehicle.coordinator_contact || null,
                event_id: vehicle.event_id, // Link to the event they were found in
                department_id: 'd5',
                status: 'Active'
            };

            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([newUserData])
                .select()
                .single();

            if (createError) {
                console.error(`Failed to create user for '${coordName}':`, createError.message);
                continue;
            }

            targetUserId = newUser.id;
            // Update map so we don't create duplicates for the same coordinator on multiple vehicles
            userMap.set(normalizedName, newUser);
            createdCount++;
        }

        // C. Update Vehicle with UID
        const { error: updateError } = await supabase
            .from('vehicles')
            .update({ coordinator_uid: targetUserId })
            .eq('id', vehicle.id);

        if (updateError) {
            console.error(`Failed to update vehicle ${vehicle.id}:`, updateError.message);
        } else {
            updatedCount++;
        }
    }

    console.log("Migration Complete.");
    console.log(`Users Created: ${createdCount}`);
    console.log(`Vehicles Updated: ${updatedCount}`);
}

migrateCoordinators();
