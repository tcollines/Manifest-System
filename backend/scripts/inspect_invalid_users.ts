
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function run() {
    console.log("--- INSPECTING INVALID USERS ---");

    const { data: users, error } = await supabase.from('users').select('id, username, role');

    if (error) { console.error("Error:", error); return; }

    const invalid = users.filter(u => !UUID_REGEX.test(u.id));

    console.log(`Total Users: ${users.length}`);
    console.log(`Invalid Count: ${invalid.length}`);

    if (invalid.length > 0) {
        console.log("INVALID RECORDS:");
        invalid.forEach(u => {
            console.log(`ID: ${u.id}`);
            console.log(`DETAILS: ${u.role} | ${u.username}`);
            console.log('---');
        });
    } else {
        console.log("✅ No invalid users found!");
    }
}

run();
