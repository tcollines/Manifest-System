require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function run() {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log('--- STARTING GLOBAL IDENTITY GAP AUDIT ---');

    // 1. Fetch all public users
    const { data: pUsers, error: pErr } = await sb.from('users').select('id, email, name, role');
    if (pErr) {
        console.error('Failed to fetch public users:', pErr.message);
        return;
    }
    console.log(`Scanning ${pUsers.length} public users...`);

    // 2. Fetch all auth users via deep recursive scan
    console.log('Fetching all Auth identities (paginated)...');
    const authMap = new Set();
    let page = 1;
    while (true) {
        const { data: { users }, error: aErr } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
        if (aErr) {
            console.error(`Error on auth page ${page}:`, aErr.message);
            break;
        }
        if (!users || users.length === 0) break;

        users.forEach(u => authMap.add(u.id));
        page++;
    }
    console.log(`Found ${authMap.size} valid Auth identities.`);

    // 3. Identify Gaps
    const gaps = pUsers.filter(u => !authMap.has(u.id));

    if (gaps.length === 0) {
        console.log('✅ COMPLETE: 0 Identity Gaps found. All users are correctly mapped.');
    } else {
        console.log(`⚠️ FOUND ${gaps.length} IDENTITY GAPS:`);
        console.table(gaps.map(g => ({
            id: g.id,
            name: g.name,
            email: g.email || 'NULL',
            role: g.role
        })));
        console.log('\nThese users exist in public.users but MISSING in auth.users.');
    }
}

run().catch(console.error);
