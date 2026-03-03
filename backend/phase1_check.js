require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function runPhase1() {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('--- PHASE 1: DATABASE INVARIANT CHECKS ---');

    // Fetch all auth.users
    const { data: authUsersRes, error: authErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
    if (authErr) {
        console.error('Failed to fetch auth users:', authErr);
        return;
    }
    const authUsers = authUsersRes.users || [];

    // Fetch all public.users
    const { data: publicUsers, error: pubErr } = await sb.from('users').select('*');
    if (pubErr) {
        console.error('Failed to fetch public users:', pubErr);
        return;
    }

    console.log(`1a. auth.users count: ${authUsers.length}`);
    console.log(`1b. public.users count: ${publicUsers.length}`);

    // 1c. Orphaned public.users
    const authIds = new Set(authUsers.map(u => u.id));
    const pubIds = new Set(publicUsers.map(u => u.id));

    const orphanedPub = publicUsers.filter(u => !authIds.has(u.id));
    console.log(`1c. Orphaned public.users (missing auth.users): ${orphanedPub.length} ${orphanedPub.length === 0 ? '🟢 PASS' : '🔴 FAIL'}`);
    if (orphanedPub.length > 0) console.log(orphanedPub.map(u => ({ id: u.id, email: u.email })));

    // 2. Duplicate Username Check
    const usernameCounts = {};
    publicUsers.forEach(u => {
        if (u.username) {
            usernameCounts[u.username] = (usernameCounts[u.username] || 0) + 1;
        }
    });
    const duplicateUsernames = Object.keys(usernameCounts).filter(un => usernameCounts[un] > 1);
    console.log(`2. Duplicate Usernames: ${duplicateUsernames.length} ${duplicateUsernames.length === 0 ? '🟢 PASS' : '🔴 FAIL'}`);
    if (duplicateUsernames.length > 0) console.log('Dupes:', duplicateUsernames);

    // 3. Duplicate Email in public.users
    const emailCounts = {};
    publicUsers.forEach(u => {
        if (u.email && !u.email.startsWith('deleted_')) {
            emailCounts[u.email] = (emailCounts[u.email] || 0) + 1;
        }
    });
    const duplicateEmails = Object.keys(emailCounts).filter(e => emailCounts[e] > 1);
    console.log(`3. Duplicate Emails (active): ${duplicateEmails.length} ${duplicateEmails.length === 0 ? '🟢 PASS' : '🔴 FAIL'}`);
    if (duplicateEmails.length > 0) console.log('Dupes:', duplicateEmails);

    // 4. JWT Metadata Role Leak Check
    const leaks = authUsers.filter(u => u.user_metadata && u.user_metadata.role !== undefined);
    console.log(`4. JWT Metadata Role Leak: ${leaks.length} ${leaks.length === 0 ? '🟢 PASS' : '🔴 FAIL'}`);
    if (leaks.length > 0) console.log('Leaks:', leaks.map(u => ({ id: u.id, role: u.user_metadata.role })));

    // 5. Ghost GoTrue Identities
    const ghostAuth = authUsers.filter(u => !pubIds.has(u.id));
    console.log(`5. Ghost GoTrue Identities (missing public.users): ${ghostAuth.length} ${ghostAuth.length === 0 ? '🟢 PASS' : '🔴 FAIL'}`);
    if (ghostAuth.length > 0) console.log('Ghosts:', ghostAuth.map(u => ({ id: u.id, email: u.email })));

    // Phase 4 Part 1: OAuth Identity Integrity Check
    const googleIdentitiesByUser = {};
    let deletedUserOAuthConflicts = 0;

    authUsers.forEach(u => {
        const gIds = (u.identities || []).filter(i => i.provider === 'google');
        if (gIds.length > 1) {
            googleIdentitiesByUser[u.id] = gIds.length;
        }

        const pubMatch = publicUsers.find(pu => pu.id === u.id);
        if (pubMatch && pubMatch.status === 'Deleted' && gIds.length > 0) {
            deletedUserOAuthConflicts++;
        }
    });

    const duplicateGoogleIds = Object.keys(googleIdentitiesByUser);
    console.log(`P4. Multiple Google Identities per user: ${duplicateGoogleIds.length} ${duplicateGoogleIds.length === 0 ? '🟢 PASS' : '🔴 FAIL'}`);

    console.log(`P4. Soft-deleted users with active auth identities: ${deletedUserOAuthConflicts} ${deletedUserOAuthConflicts === 0 ? '🟢 PASS' : '🔴 FAIL'}`);
}

runPhase1().catch(console.error);
