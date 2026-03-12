require('dotenv').config({ path: 'd:/Manifest System/backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const identifier = 'Francis';
    console.log(`Checking ${identifier}...`);

    try {
        console.log("--- PUBLIC.USERS ---");
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .or(`username.ilike.${identifier},email.ilike.${identifier}`);

        if (error) throw error;
        console.log(data);

        console.log("--- GOTRUE AUTH USERS ---");
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        const authMatches = authData.users.filter(u =>
            u.email.toLowerCase().includes(identifier.toLowerCase()) ||
            (u.user_metadata && u.user_metadata.username && u.user_metadata.username.toLowerCase().includes(identifier.toLowerCase()))
        );
        console.log(authMatches.length > 0 ? authMatches : 'No Auth User Found');
    } catch (e) {
        console.error("Test execution failed:", e);
    }
}

run();
