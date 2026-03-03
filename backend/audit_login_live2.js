require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const crypto = require('crypto');

async function auditLogin() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log('--- LIVE LOGIN AUDIT ---');
    const mockId = crypto.randomUUID();
    const mockEmail = `audit_${Date.now()}@manifest.local`;
    const mockUsername = 'audittester' + Date.now();

    console.log(`[1] Creating Dummy User public.users... (${mockId})`);
    await supabaseService.from('users').insert([{
        id: mockId,
        username: mockUsername,
        email: mockEmail,
        password: 'AuditPassword123!',
        role: 'Member',
        name: 'Audit Tester',
        status: 'Active',
        manifest_id: '593fbdbb-8211-44ca-b3e2-8d999c88680c'
    }]);

    console.log(`[2] Provisioning GoTrue Identity...`);
    await supabaseService.auth.admin.createUser({
        id: mockId,
        email: mockEmail,
        password: 'AuditPassword123!',
        email_confirm: true
    });

    console.log(`\\n[3] Executing HTTP POST to Proxy via Username...`);
    const postData = JSON.stringify({
        username: mockUsername,
        password: 'AuditPassword123!'
    });

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            console.log(`\\n[PROXY RESPONSE] Status: ${res.statusCode}`);
            console.log(`[PROXY BODY] ${rawData}`);

            console.log(`\\n[4] Executing HTTP POST to Proxy via Email...`);
            const postData2 = JSON.stringify({
                username: mockEmail,
                password: 'AuditPassword123!'
            });
            const req2 = http.request({ ...options, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData2) } }, (res2) => {
                let r2 = '';
                res2.on('data', (c) => r2 += c);
                res2.on('end', () => {
                    console.log(`\\n[PROXY RESPONSE 2] Status: ${res2.statusCode}`);
                    console.log(`[PROXY BODY 2] ${r2}`);
                    // Cleanup
                    supabaseService.from('users').delete().eq('id', mockId).then(() => {
                        supabaseService.auth.admin.deleteUser(mockId).then(() => {
                            console.log('\\nCleanup complete.');
                        });
                    });
                });
            });
            req2.write(postData2);
            req2.end();
        });
    });

    req.on('error', (e) => {
        console.error(`[PROXY HTTP ERROR] ${e.message}`);
    });

    req.write(postData);
    req.end();
}

auditLogin().catch(console.error);
