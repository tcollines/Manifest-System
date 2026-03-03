require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function purgeAndAlign() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log("--- EXECUTING GHOST PURGE & EMAIL ALIGNMENT ---");

    // 1. Fetch all GoTrue users
    let authUsers = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
        const { data, error } = await supabaseService.auth.admin.listUsers({ page, perPage: 100 });
        if (error) throw error;
        authUsers = authUsers.concat(data.users);
        if (data.users.length < 100) hasMore = false;
        else page++;
    }

    // 2. Fetch all Public Users
    const { data: publicUsers } = await supabaseService.from('users').select('id, email, password');
    const publicUserIds = new Set(publicUsers.map(u => u.id));

    // 3. Identify and Delete Ghosts
    let deletedCount = 0;
    for (const au of authUsers) {
        if (!publicUserIds.has(au.id)) {
            console.log(`[PURGE] Deleting ORPHAN Auth Identity: ${au.id} (${au.email})`);
            await supabaseService.auth.admin.deleteUser(au.id);
            deletedCount++;
        }
    }

    console.log(`\\nGhost Purge Complete. Deleted ${deletedCount} orphans.`);

    // 4. Re-Align Emails for Valid Users
    let synced = 0;
    for (const pu of publicUsers) {
        if (!pu.email || !pu.password || pu.password.startsWith('PENDING_')) continue;

        try {
            const { error: updateErr } = await supabaseService.auth.admin.updateUserById(pu.id, {
                email: pu.email,
                password: pu.password,
                email_confirm: true
            });

            if (updateErr) {
                console.log(`[WARN] Failed to align ${pu.email} on ${pu.id}:`, updateErr.message);
            } else {
                console.log(`[ALIGNED] Successfully merged credentials for: ${pu.email}`);
                synced++;
            }
        } catch (e) {
            console.log(`[EXCEPTION] Skipped ${pu.id}`);
        }
    }

    console.log(`\\nAlignment Complete. Successfully re-synced ${synced} identities.`);
}

purgeAndAlign().catch(console.error);
