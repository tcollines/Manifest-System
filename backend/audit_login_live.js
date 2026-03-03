require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const http = require('http');

async function auditLogin() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log("--- LIVE LOGIN AUDIT ---");

    // 1. Teardown any previous audit
    await supabaseService.from('users').delete().eq('username', 'audittester1');
    await supabaseService.auth.admin.deleteUser('00000000-0000-0000-0000-000000000001').catch(() => null);

    // 2. Create Public User (simulating Admin Panel Manual Add)
    const mockId = crypto.randomUUID();
    const mockEmail = `audit_${Date.now()}@manifest.local`;

    console.log(`[1] Creating Dummy User public.users... (${mockId})`);
    await supabaseService.from('users').insert([{
        id: mockId,
        username: 'audittester1',
        email: mockEmail,
        password: 'AuditPassword123!',
        role: 'Member',
        name: 'Audit Tester',
        status: 'Active',
        manifest_id: '593fbdbb-8211-44ca-b3e2-8d999c88680c'
    }]);

    // 3. Provision GoTrue Identity (simulating the sync_passwords / Setup backfill hook)
    console.log(`[2] Provisioning GoTrue Identity...`);
    await supabaseService.auth.admin.createUser({
        id: mockId,
        email: mockEmail,
        password: 'AuditPassword123!',
        email_confirm: true
    });

    // 4. Test Native Login via Proxy
    console.log(`[3] Executing HTTP POST to Proxy...`);

    const postData = JSON.stringify({
        username: 'audittester1',
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

            // Cleanup
            supabaseService.from('users').delete().eq('id', mockId).then(() => {
                supabaseService.auth.admin.deleteUser(mockId).then(() => {
                    console.log("Cleanup complete.");
                });
            });
        });
    });

    req.on('error', (e) => {
        console.error(`[PROXY HTTP ERROR] ${e.message}`);
    });

    req.write(postData);
    req.end();
}

auditLogin().catch(console.error);
