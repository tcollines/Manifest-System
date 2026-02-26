
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

async function repairUserMetadata() {
    console.log("Starting User Metadata Repair...");

    // 1. Fetch all users from public.users to get their manifest_ids
    const { data: dbUsers, error: dbError } = await supabase
        .from('users')
        .select('id, email, manifest_id, role');

    if (dbError) {
        console.error("Error fetching public users:", dbError);
        return;
    }

    console.log(`Found ${dbUsers.length} users in database.`);

    // 2. Fetch all users from auth.users (Admin API) 
    // We'll iterate manually if more than 50, but let's check current set first.
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error("Error fetching auth users:", authError);
        return;
    }

    console.log(`Found ${authUsers.length} users in current auth chunk.`);

    let updateCount = 0;

    for (const dbUser of dbUsers) {
        const authUser = authUsers.find(u => u.id === dbUser.id);

        if (!authUser) {
            // If not in this chunk, we skip for now 
            continue;
        }

        const currentMetadata = authUser.app_metadata || {};

        if (!currentMetadata.manifest_id || currentMetadata.manifest_id !== dbUser.manifest_id) {
            console.log(`[FIX] Updating metadata for ${dbUser.email}...`);

            const { error: updateError } = await supabase.auth.admin.updateUserById(
                dbUser.id,
                {
                    app_metadata: {
                        ...currentMetadata,
                        manifest_id: dbUser.manifest_id,
                        role: dbUser.role
                    }
                }
            );

            if (updateError) {
                console.error(`[ERROR] Failed to update ${dbUser.email}:`, updateError.message);
            } else {
                updateCount++;
            }
        }
    }

    console.log(`Repair Complete. Updated ${updateCount} users in this chunk.`);
}

repairUserMetadata();
