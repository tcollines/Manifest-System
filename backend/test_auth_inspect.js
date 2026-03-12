const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectUser() {
    const username = 'Testv';
    console.log(`Inspecting user: ${username}`);

    const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${username},email.ilike.${username}`);

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    console.log('User Record from public.users:', JSON.stringify(userData, null, 2));

    if (userData.length > 0) {
        const email = userData[0].email || `${username.toLowerCase().replace(/\s+/g, '')}@manifest.local`;
        console.log(`Target email for login: ${email}`);

        // Let's also try to get the auth user record to see if they exist in auth.users
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) {
            console.error('Error fetching auth users:', authError);
            return;
        }

        const matchingAuthUser = authUsers.users.find(u => u.email === email);
        if (matchingAuthUser) {
            console.log('Matching auth.user found:', matchingAuthUser.id);
        } else {
            console.log('ERROR: No matching auth.user found for email:', email);
        }
    }
}

inspectUser();
