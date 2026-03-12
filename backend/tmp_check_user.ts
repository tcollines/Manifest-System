
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

async function checkUser(identifier: string) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike."${identifier}",email.ilike."${identifier}"`);

    if (error) {
        fs.writeFileSync('check_result.json', JSON.stringify({ error: error.message }));
        return;
    }

    if (data && data.length > 0) {
        fs.writeFileSync('check_result.json', JSON.stringify(data, null, 2));
    } else {
        fs.writeFileSync('check_result.json', JSON.stringify({ message: "No user found" }));
    }
}

const identifier = process.argv[2] || 'harriet';
checkUser(identifier);
