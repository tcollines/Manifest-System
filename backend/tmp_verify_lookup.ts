
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateLookup(username: string) {
    console.log(`\nSimulating lookup for: "${username}"`);

    // Step 1: Exact Match
    let { data: usersData, error } = await supabase
        .from('users')
        .select('email, role')
        .or(`username.eq."${username}",email.eq."${username}"`)
        .neq('status', 'Deleted')
        .limit(1);

    if (usersData && usersData.length > 0) {
        console.log(`[EXACT] Found user: ${usersData[0].email} (${usersData[0].role})`);
        return;
    }

    // Step 2: Fallback
    const fallbackResult = await supabase
        .from('users')
        .select('email, role')
        .or(`username.ilike."${username}",email.ilike."${username}"`)
        .neq('status', 'Deleted')
        .limit(1);

    if (fallbackResult.data && fallbackResult.data.length > 0) {
        console.log(`[FALLBACK] Found user: ${fallbackResult.data[0].email} (${fallbackResult.data[0].role})`);
    } else {
        console.log(`[NONE] No user found.`);
    }
}

async function runTests() {
    await simulateLookup('Harriet');  // Should be Harriet Kabusozi (Vehicle Coordinator)
    await simulateLookup('harriet');  // Should be Harriet kobussobuzi (Logistics)
    await simulateLookup('francis');  // Should be FrancisM (Fallback)
}

runTests();
