
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function run() {
    console.log("--- DUMPING INVALID USERS ---");

    const { data: users, error } = await supabase.from('users').select('id, username, role, created_at');

    if (error) { console.error("Error:", error); return; }

    const invalid = users.filter(u => !UUID_REGEX.test(u.id));

    console.log(`Total: ${users.length}, Invalid: ${invalid.length}`);

    if (invalid.length > 0) {
        fs.writeFileSync('invalid_users.json', JSON.stringify(invalid, null, 2));
        console.log("Dumped to invalid_users.json");
    } else {
        console.log("✅ No invalid users found!");
    }
}
run();
