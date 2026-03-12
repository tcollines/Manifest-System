
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

async function testSyntax() {
    const username = 'francis';
    console.log(`Testing ilike for: ${username}`);

    const { data, error } = await supabase
        .from('users')
        .select('username, email')
        .or(`username.ilike.${username},email.ilike.${username}`) // No quotes
        .limit(5);

    console.log("Result (no quotes):", JSON.stringify(data, null, 2));

    const { data: data2, error: error2 } = await supabase
        .from('users')
        .select('username, email')
        .or(`username.ilike."${username}",email.ilike."${username}"`) // Double quotes
        .limit(5);

    console.log("Result (double quotes):", JSON.stringify(data2, null, 2));
}

testSyntax();
