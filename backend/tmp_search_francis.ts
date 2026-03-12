
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

async function findFrancis() {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', '%Francis%');

    if (error) {
        fs.writeFileSync('francis_search.json', JSON.stringify({ error: error.message }));
        return;
    }

    fs.writeFileSync('francis_search.json', JSON.stringify(data, null, 2));
}

findFrancis();
