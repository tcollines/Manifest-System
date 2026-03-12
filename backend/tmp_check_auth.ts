
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

async function checkAuth(emails: string[]) {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        fs.writeFileSync('auth_result.json', JSON.stringify({ error: authError.message }));
        return;
    }

    const matches = authData.users.filter(u => emails.some(e => e.toLowerCase() === u.email?.toLowerCase()));
    fs.writeFileSync('auth_result.json', JSON.stringify(matches, null, 2));
}

const emails = [
    "harriet_mmftdkog7q2y@manifest.local",
    "harriet_mmenipwg9olm@manifest.local"
];
checkAuth(emails);
