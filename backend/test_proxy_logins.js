require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testProxyLogins() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // fetch all active users who don't have pending password
    const { data: users, error } = await supabaseService.from('users')
        .select('username, email, password')
        .not('username', 'is', null)
        .not('password', 'is', null)
        .not('password', 'like', 'PENDING_%')
        .neq('status', 'Deleted');

    if (error) {
        console.error(error);
        return;
    }

    let results = [];
    for (const u of users) {
        if (!u.username || !u.password || !u.email) continue;

        try {
            // Frontend sends payload { username: string, password: string } 
            const fetchRes = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u.username, password: u.password })
            });
            const text = await fetchRes.text();
            results.push({ username: u.username, statusCode: fetchRes.status, response: text });
            console.log(`Tested ${u.username}: ${fetchRes.status}`);
        } catch (e) {
            results.push({ username: u.username, error: e.message });
            console.log(`Error ${u.username}: ${e.message}`);
        }
    }
    fs.writeFileSync('proxy_test_results.json', JSON.stringify(results, null, 2));
    console.log("Wrote proxy_test_results.json");
}

testProxyLogins().catch(console.error);
