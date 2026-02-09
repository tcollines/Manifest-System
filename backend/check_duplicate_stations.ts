
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicateStations() {
    console.log("Checking for duplicate station names...");
    const { data: stations, error } = await supabase
        .from('pickup_stations')
        .select('id, name, event_id');

    if (error) {
        console.error("Error fetching stations:", error);
        return;
    }

    const nameMap: Record<string, any[]> = {};
    stations?.forEach(s => {
        if (!nameMap[s.name]) nameMap[s.name] = [];
        nameMap[s.name].push(s);
    });

    for (const name in nameMap) {
        if (nameMap[name].length > 1) {
            console.log(`Duplicate Station Name: "${name}"`);
            nameMap[name].forEach((s: any) => {
                console.log(`  - ID: ${s.id}, EventID: ${s.event_id}`);
            });
        }
    }
}

checkDuplicateStations();
