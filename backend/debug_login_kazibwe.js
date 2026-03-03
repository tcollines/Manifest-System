require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function debugUser() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const email = 'kazibwecollins1@gmail.com';

    console.log(`--- DEBUGGING USER: ${email} ---`);

    // 1. Check in 'users' table (Public Table)
    const { data: userData, error: userError } = await supabaseService
        .from('users')
        .select('*')
        .eq('email', email);

    if (userError) {
        console.error('Error fetching from users table:', userError);
    } else {
        console.log('Users Table records:', userData);
    }

    // 2. Check in 'auth.users' (Internal Auth)
    const { data: authData, error: authError } = await supabaseService.auth.admin.listUsers();

    if (authError) {
        console.error('Error listing auth users:', authError);
    } else {
        const authUser = authData.users.find(u => u.email === email);
        if (authUser) {
            console.log('Auth User found:', {
                id: authUser.id,
                email: authUser.email,
                last_sign_in_at: authUser.last_sign_in_at,
                confirmed_at: authUser.confirmed_at,
                app_metadata: authUser.app_metadata,
                user_metadata: authUser.user_metadata
            });
        } else {
            console.log('User not found in auth.users');
        }
    }
}

debugUser().catch(console.error);
