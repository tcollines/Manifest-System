require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const email = 'elizabethabuo23@gmail.com';
    console.log(`Checking ${email}...`);

    try {
        const { data, error } = await supabase.from('users').select('*').ilike('email', email);
        if (error) throw error;

        console.log("DB Matches from 'users' table:");
        console.log(data);

        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        const authMatch = authData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        console.log("Auth Match from GoTrue:");
        console.log(authMatch || 'No Auth User Found');
    } catch (e) {
        console.error("Test execution failed:", e);
    }
}

run();
