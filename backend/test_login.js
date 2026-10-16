require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY);

async function checkLogin() {
    const inputIdentifier = 'checkpayload123';
    const password = 'password123';

    const { data: usersData, error } = await supabase
        .from('users')
        .select('id, username, email, password')
        .or(`username.eq.${inputIdentifier},email.ilike.${inputIdentifier}`)
        .neq('status', 'Deleted')
        .limit(1);

    if (!usersData || usersData.length === 0) return;

    const data = usersData[0];
    const targetEmail = data.email || `${inputIdentifier.toLowerCase().replace(/\s+/g, '')}@manifest.local`;

    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
        email: targetEmail,
        password: password
    });

    const result = {
        usersData,
        targetEmail,
        authSession: !!authData?.session,
        authError
    };

    fs.writeFileSync('login_result.json', JSON.stringify(result, null, 2));
}

checkLogin();
