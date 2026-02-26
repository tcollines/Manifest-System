
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

async function checkMpala() {
    console.log("Checking assignments for 'Mpala'...");

    // 1. Find users with Mpala in name
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, name, role, username, password, email, station_id')
        .or('name.ilike.%Mpala%,name.ilike.%Lydia%,name.ilike.%Aine%');

    if (userError) {
        console.error("Error fetching users:", userError);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No users with 'Mpala' found.");
        return;
    }

    console.log(`Found ${users.length} users matching 'Mpala':`);
    users.forEach(u => console.log(`- Name: ${u.name}, ID: ${u.id}, Role: ${u.role}, Username: ${u.username}, Password: ${u.password}`));

    // 2. Find ALL vehicles and check for coordinator names/uids
    const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*');

    if (vehicleError) {
        console.error("Error fetching vehicles:", vehicleError);
        return;
    }

    console.log(`\nChecking all ${vehicles.length} vehicles for Mpala matches...`);
    vehicles.forEach(v => {
        const isNameMatch = users.some(u => v.coordinator?.trim().toLowerCase() === u.name.trim().toLowerCase());
        const isUidMatch = users.some(u => v.coordinator_uid === u.id);

        if (isNameMatch || isUidMatch) {
            console.log(`MATCH FOUND:`);
            console.log(`- Vehicle: ${v.number_plate}`);
            console.log(`- Assigned Name: ${v.coordinator}`);
            console.log(`- Assigned UID: ${v.coordinator_uid}`);
            console.log(`- Status: Name Match: ${isNameMatch}, UID Match: ${isUidMatch}`);
        }
    });
}

checkMpala().catch(console.error);
