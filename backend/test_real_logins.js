require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const http = require('http');

async function testRealLogins() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log("--- TESTING REAL LOGINS LOCALLY ---");

    const { data: users } = await supabaseService.from('users').select('username, email, password').not('username', 'is', null).not('password', 'is', null).neq('status', 'Deleted').limit(10);

    for (const u of users) {
        if (!u.username || u.password.startsWith('PENDING_')) continue;

        console.log(`\\n[*] Testing username: ${u.username}`);
        await new Promise(resolve => {
            const postData = JSON.stringify({
                username: u.username,
                password: u.password
            });
            const req = http.request({
                hostname: 'localhost',
                port: 5000,
                path: '/api/auth/login',
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    console.log(`    Status: ${res.statusCode}`);
                    if (res.statusCode !== 200) console.log(`    Body: ${body.trim()}`);
                    resolve();
                });
            });
            req.on('error', e => { console.log(`    HTTP Error: ${e.message}`); resolve(); });
            req.write(postData);
            req.end();
        });
    }
}
testRealLogins().catch(console.error);
