
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectLogisticsUsers() {
    console.log('--- INSPECTING LOGISTICS USERS ---');

    // 1. Fetch Users with role 'Logistics'
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'Logistics')
        .limit(10);

    if (error) {
        console.error("Error fetching users:", error.message);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No Logistics users found.");
        return;
    }

    console.log(`Found ${users.length} Logistics users. Sample:`);
    console.log(JSON.stringify(users[0], null, 2));

    // Check specifically for station_id or stationId
    const firstUser = users[0];
    console.log("ALL User Keys:", Object.keys(firstUser));

    if ('station_id' in firstUser) {
        console.log("✅ Column 'station_id' exists.");
    } else if ('stationId' in firstUser) {
        console.log("✅ Column 'stationId' exists.");
    } else if ('station_uid' in firstUser) { // Maybe using UID suffix?
        console.log("✅ Column 'station_uid' exists.");
    } else {
        console.log("❌ NO station-related column found in returned object. Keys:", Object.keys(firstUser));
    }
}

inspectLogisticsUsers();
