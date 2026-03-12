
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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
        console.error("Error fetching user:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Found Users:", JSON.stringify(data, null, 2));
    } else {
        console.log("No user found with identifier:", identifier);
    }
}

const identifier = process.argv[2] || 'harriet';
checkUser(identifier);
