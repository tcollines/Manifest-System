require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function run() {
    console.log('Fetching Koko by explicit ID from public.users...');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: pubData, error: pubErr } = await supabase.from('users').select('id, email, password').ilike('email', 'Kweenkoko3@gmail.com').limit(1);
    if (pubErr || !pubData) {
        console.log('Public user fetch error:', pubErr);
        return;
    }

    console.log('Public ID:', pubData[0].id);
    const { data: userObj, error } = await supabase.auth.admin.getUserById(pubData[0].id);

    if (error) {
        console.log('Auth error:', error.message);
    } else {
        console.log('FOUND AUTH USER DIRECTLY:', userObj.user.email);
        console.log('Updating password natively because she definitely exists!');
        await supabase.auth.admin.updateUserById(pubData[0].id, { password: pubData[0].password, email_confirm: true });
        console.log('Password strictly synced to:', pubData[0].password);

        // Now test proxy again immediately
        const res = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Koko', password: pubData[0].password })
        });
        const status = res.status;
        const text = await res.text();
        console.log('Proxy Test HTTP Response:', status, text);
    }
}
run();
