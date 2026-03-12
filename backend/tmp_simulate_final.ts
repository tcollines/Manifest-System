
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function simulate(username: string) {
    console.log(`\nTesting: "${username}"`);

    // Step 1: Exact
    let { data: exactData } = await supabase
        .from('users')
        .select('username, email')
        .or(`username.eq."${username}",email.eq."${username}"`)
        .limit(1);

    if (exactData && exactData.length > 0) {
        console.log(`[EXACT] ${exactData[0].username} -> ${exactData[0].email}`);
        return;
    }

    // Step 2: Fallback
    let { data: fallbackData } = await supabase
        .from('users')
        .select('username, email')
        .or(`username.ilike."${username}",email.ilike."${username}"`)
        .limit(1);

    if (fallbackData && fallbackData.length > 0) {
        console.log(`[FALLBACK] ${fallbackData[0].username} -> ${fallbackData[0].email}`);
    } else {
        console.log(`[NONE]`);
    }
}

async function run() {
    await simulate('Harriet');
    await simulate('harriet');
    await simulate('Francis'); // No exact match
    await simulate('francism'); // Fallback match
}
run();
