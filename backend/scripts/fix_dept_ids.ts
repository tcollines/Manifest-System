
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL || 'https://jhykmbmctfbshwsjofhg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    console.log("Fetching Coordinators with null department_id...");
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'Coordinator')
        .is('department_id', null);

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    console.log(`Found ${users.length} users to update.`);

    for (const user of users) {
        const { error: updateError } = await supabase
            .from('users')
            .update({ department_id: 'd5' })
            .eq('id', user.id);

        if (updateError) {
            console.error(`Failed to update user ${user.name}:`, updateError);
        } else {
            console.log(`Updated user ${user.name} (${user.id})`);
        }
    }
    console.log("Done.");
}

fix();
