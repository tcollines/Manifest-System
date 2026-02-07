
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

async function linkUsers() {
    console.log("Linking restored users to stations...");

    // Mpala Stage ID: a85f988c-fb54-467b-8521-c12a308836f5
    const mpalaStageId = 'a85f988c-fb54-467b-8521-c12a308836f5';

    const links = [
        { id: '2e58f70c-51bd-4ab6-80b4-b28dca8aa41a', station_id: mpalaStageId }, // Mpala Stage Coordinator
        { id: '93b79c98-97ca-4c95-9107-1bbd01f3d5e2', station_id: mpalaStageId }  // mpala Logistics (Data Entrant)
    ];

    for (const link of links) {
        console.log(`- Linking user ${link.id} to station ${link.station_id}`);
        const { error } = await supabase.from('users').update({ station_id: link.station_id }).eq('id', link.id);
        if (error) {
            console.error(`  Error linking user ${link.id}:`, error.message);
        } else {
            console.log(`  Link successful.`);
        }
    }

    console.log("\nLinking Complete.");
}

linkUsers().catch(console.error);
