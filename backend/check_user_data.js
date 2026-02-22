const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
    const oldId = '67b59a2d-b106-4fc6-8151-61c88680c144';
    console.log(`Checking data for ID: ${oldId}`);

    const tables = ['requisitions', 'souls', 'members', 'pickup_stations', 'ministry_events'];

    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .or(`created_by.eq.${oldId},id.eq.${oldId}`); // Use OR for columns that might hold user IDs

            if (error) {
                // Try just created_by if ID is not a column
                const { count: c2, error: e2 } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true })
                    .eq('created_by', oldId);

                if (!e2) console.log(`${table}: ${c2} rows found via created_by`);
            } else {
                console.log(`${table}: ${count} rows found`);
            }
        } catch (e) {
            // Table might not have created_by
        }
    }
}

checkData();
