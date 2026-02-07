
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

async function restoreUsers() {
    console.log("Restoring mis-merged users...");

    const usersToRestore = [
        {
            id: '2e58f70c-51bd-4ab6-80b4-b28dca8aa41a',
            name: 'Mpala',
            role: 'Stage Coordinator',
            department_id: 'd5',
            username: 'mpala_stage',
            password: '123',
            status: 'Active'
        },
        {
            id: '93b79c98-97ca-4c95-9107-1bbd01f3d5e2',
            name: 'mpala',
            role: 'Logistics',
            department_id: 'd5',
            username: 'mpala_logistics',
            password: '123',
            status: 'Active'
        },
        {
            id: 'b87e6bbd-7516-4afc-a753-9ff8042ea4ac',
            name: 'Lydia Ddembe',
            role: 'Logistics',
            department_id: 'd5',
            username: 'lydia_log1',
            password: '123',
            status: 'Active'
        },
        {
            id: '7427ce8c-1dde-42e8-934e-af473796ff09',
            name: 'Lydia Ddembe',
            role: 'Logistics',
            department_id: 'd5',
            username: 'lydia_log2',
            password: '123',
            status: 'Active'
        }
    ];

    for (const u of usersToRestore) {
        console.log(`- Restoring user: ${u.name} (${u.role}) with ID: ${u.id}`);
        // Check if ID exists (just in case)
        const { data: existing } = await supabase.from('users').select('id').eq('id', u.id).single();
        if (existing) {
            console.log(`  User with ID ${u.id} already exists. Skipping.`);
            continue;
        }

        const { error } = await supabase.from('users').insert(u);
        if (error) {
            console.error(`  Error restoring user ${u.name}:`, error.message);
        } else {
            console.log(`  User ${u.name} restored successfully.`);
        }
    }

    // Now, we need to try and fix the vehicles. 
    // This part is tricky because we replaced the coordinator_uid.
    // However, for Logistics/Data Entrant, they usually don't have vehicles.
    // For Stage Coordinator, they also might not have vehicles.
    // The issue was likely that the Primary now has TOO MANY vehicles or visibility into things it shouldn't.

    // Actually, the best way to handle "same name, different person" is to NOT merge them.
    // I'll also check if there were others. Lydia Ddembe ones.

    console.log("\nRestoration Complete.");
}

restoreUsers().catch(console.error);
