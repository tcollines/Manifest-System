require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function repair() {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log("--- PHASE 1 REMEDIATION ---");

    // 1. Scrub JWT Role Metadata Leak
    console.log("Scrubbing JWT user_metadata roles...");
    const { data: authUsersRes } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const leaks = (authUsersRes.users || []).filter(u => u.user_metadata && u.user_metadata.role !== undefined);

    for (const user of leaks) {
        const newMeta = { ...user.user_metadata };
        delete newMeta.role; // Nullify role entirely
        await sb.auth.admin.updateUserById(user.id, { user_metadata: newMeta });
        console.log(`Scrubbed JWT role for: ${user.id}`);
    }

    // 2. Parity Backfill: Create shell auth.users for orphaned public.users
    console.log("Provisioning shell GoTrue identities for orphaned public.users...");
    const pubRes = await sb.from('users').select('*');
    const publicUsers = pubRes.data || [];

    const authIds = new Set((authUsersRes.users || []).map(u => u.id));
    const orphans = publicUsers.filter(u => !authIds.has(u.id));

    for (const orphan of orphans) {
        // Create a deterministic holding email for deleted users or use actual email
        let targetEmail = orphan.email;
        if (!targetEmail) {
            targetEmail = `placeholder_${orphan.id}@manifest.local`;
        }

        const { data, error } = await sb.auth.admin.createUser({
            id: orphan.id,
            email: targetEmail,
            password: `PENDING_SETUP_${Date.now()}_${orphan.id.substring(0, 5)}!`,
            email_confirm: true
        });

        if (error) {
            console.error(`Failed to provision shell for ${orphan.id} (${targetEmail}):`, error.message);
        } else {
            console.log(`Provisioned shell for ${orphan.id} (${targetEmail}) successfully.`);
        }
    }
}

repair().catch(console.error);
