const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE env vars.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const email = 'tcollines004@gmail.com';
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("Error listing users:", error);
        return;
    }

    const user = users.users.find((u) => u.email === email);
    if (!user) {
        console.log(`User ${email} not found in auth.users.`);
    } else {
        console.log(`Found user ${email} with ID ${user.id}. Deleting to fix Google Auth conflict...`);
        const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
        if (delError) {
            console.error("Error deleting user:", delError);
        } else {
            console.log(`Successfully deleted auth user ${email}.`);
        }
    }
}

run();
