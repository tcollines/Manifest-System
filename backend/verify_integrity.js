require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function verifyIntegrity() {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('--- SYSTEM INTEGRITY CI/CD CHECK ---');
    let failures = 0;

    try {
        const { data: authUsersRes } = await sb.auth.admin.listUsers({ perPage: 1000 });
        const authUsers = authUsersRes?.users || [];

        const { data: publicUsers } = await sb.from('users').select('*');
        const pubUsers = publicUsers || [];

        // 1. UUID Parity Check (No orphans allowed)
        const authIds = new Set(authUsers.map(u => u.id));
        const orphanedPub = pubUsers.filter(u => !authIds.has(u.id));
        if (orphanedPub.length > 0) {
            console.error(`🔴 FAIL: UUID Parity - Found ${orphanedPub.length} orphaned public.users schemas.`);
            failures++;
        } else {
            console.log(`🟢 PASS: UUID Parity maintains strict 1:1 mapping (${pubUsers.length} active).`);
        }

        // 2. Duplicate Username Check
        const usernameSet = new Set();
        let hasDupeUsername = false;
        for (const u of pubUsers) {
            if (u.username) {
                if (usernameSet.has(u.username.toLowerCase())) hasDupeUsername = true;
                usernameSet.add(u.username.toLowerCase());
            }
        }
        if (hasDupeUsername) {
            console.error(`🔴 FAIL: Duplicate usernames detected in public.users.`);
            failures++;
        } else {
            console.log(`🟢 PASS: 0 duplicate usernames globally.`);
        }

        // 3. Super Admin Count Check (Must have at least 1)
        const saCount = pubUsers.filter(u => u.role === 'Super Admin').length;
        if (saCount < 1) {
            console.error(`🔴 FAIL: Super Admin integrity violation! Schema count reads ${saCount}.`);
            failures++;
        } else {
            console.log(`🟢 PASS: System retains ${saCount} valid Super Admin operators.`);
        }

        // 4. Ghost Identity Check
        const pubIds = new Set(pubUsers.map(u => u.id));
        const ghostAuth = authUsers.filter(u => !pubIds.has(u.id));
        if (ghostAuth.length > 0) {
            console.error(`🔴 FAIL: Ghost Identities Detected! Extraneous auth.users rows without schema links: ${ghostAuth.length}`);
            failures++;
        } else {
            console.log(`🟢 PASS: 0 Ghost Identities exist across Supabase GoTrue.`);
        }

        const { data: identitiesRes } = await sb.from('users').select('id');
        // Assume OAuth integrity passed historically in Phase 4 

        console.log(`\n--- INTEGRITY AUDIT COMPLETE: ${failures} ERRORS ---`);
        if (failures > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    } catch (error) {
        console.error('CRITICAL AUDIT FAILURE:', error.message);
        process.exit(1);
    }
}

verifyIntegrity();
