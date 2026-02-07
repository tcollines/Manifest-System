
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

async function fixUserCredentials() {
    console.log("Fixing user credentials for Mpala and Lydia...");

    const updates = [
        // Mpala
        { id: 'ed01e4b3-2db7-41dd-ad83-3aa7e4181848', username: 'mpala', password: '123' },       // Vehicle Coordinator
        { id: '2e58f70c-51bd-4ab6-80b4-b28dca8aa41a', username: 'mpala2', password: '123' },      // Stage Coordinator
        { id: '93b79c98-97ca-4c95-9107-1bbd01f3d5e2', username: 'mpala3', password: '123' },      // Logistics
        // Lydia (Already partially correct, but let's ensure)
        { id: 'ebc82734-454e-43e2-bab5-b3b812268b68', username: 'ddembe', password: '123' },
        { id: '5095846a-f530-40f1-b19e-ac95610edd99', username: 'ddembe2', password: '123' }
    ];

    for (const u of updates) {
        console.log(`- Updating user ${u.id} to username: ${u.username}`);
        const { error } = await supabase.from('users').update({ username: u.username, password: u.password }).eq('id', u.id);
        if (error) {
            console.error(`  Error updating user ${u.id}:`, error.message);
        } else {
            console.log(`  Update successful.`);
        }
    }

    console.log("\nUpdate Complete.");
}

fixUserCredentials().catch(console.error);
