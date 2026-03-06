require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYXpvcmptenN3ZWN0eHZha3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTEyNjgsImV4cCI6MjA4MjM4NzI2OH0.63UUyttqrMAvPYeiA2IIqPxTnk_WftlMLTKQ99Ejv-A');

async function checkLogin() {
    const inputIdentifier = 'checkpayload123';
    const password = 'password123';

    const { data: usersData, error } = await supabase
        .from('users')
        .select('id, username, email, password')
        .or(`username.ilike.${inputIdentifier},email.ilike.${inputIdentifier}`)
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
