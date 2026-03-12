
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSimple() {
    const username = 'francism';
    console.log(`Testing simple ilike for: ${username}`);

    const { data, error } = await supabase
        .from('users')
        .select('username')
        .ilike('username', username);

    console.log("Result:", JSON.stringify(data, null, 2));
    if (error) console.error("Error:", error);
}

testSimple();
