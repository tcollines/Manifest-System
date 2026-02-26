const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncUser() {
    const googleId = '55bbc8c5-ee4b-4869-8b83-5116e987145c';
    const email = 'abratumwe@gmail.com';
    const oldId = '67b59a2d-b106-4fc6-8151-61c88680c144';

    console.log(`--- Syncing User ${email} ---`);

    // 1. Update the ID in public.users
    console.log(`Updating ID from ${oldId} to ${googleId}...`);
    const { data, error } = await supabase
        .from('users')
        .update({ id: googleId })
        .eq('email', email);

    if (error) {
        console.error("Update failed:", error.message);
        return;
    }
    console.log("ID Update Successful.");

    // 2. Check and update potential foreign keys in other tables
    const tables = ['requisitions', 'souls', 'members', 'pickup_stations', 'ministry_events', 'service_attendance', 'vehicle_requisitions'];
    for (const table of tables) {
        try {
            const { data: updated, error: updErr } = await supabase
                .from(table)
                .update({ created_by: googleId })
                .eq('created_by', oldId);

            if (!updErr) {
                console.log(`Updated references in ${table}.`);
            }
        } catch (e) {
            // Table might not have created_by or permission issue
        }
    }

    console.log("Sync Complete.");
}

syncUser();
