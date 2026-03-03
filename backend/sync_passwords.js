require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function syncPasswords() {
    console.log("--- SYNCING PUBLIC.USERS PASSWORDS TO GOTRUE ---");
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all active users with passwords
    const { data: publicUsers, error } = await supabaseService
        .from('users')
        .select('id, email, password, username, status')
        .not('password', 'is', null)
        .neq('status', 'Deleted');

    if (error) {
        console.error("Failed to fetch public users:", error);
        return;
    }

    console.log(`Found ${publicUsers.length} active users with passwords.`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const u of publicUsers) {
        // Skip placeholders
        if (u.password.startsWith('PENDING_')) {
            skipped++;
            continue;
        }

        // Skip users without emails (cannot create GoTrue account without email)
        if (!u.email) {
            console.log(`Skipping ID ${u.id} (${u.username}): No email address.`);
            skipped++;
            continue;
        }

        try {
            // Check if GoTrue identity exists
            const { data: authCheck } = await supabaseService.auth.admin.getUserById(u.id);

            if (authCheck?.user) {
                // Identity exists. Update password to guarantee parity
                const { error: updateErr } = await supabaseService.auth.admin.updateUserById(u.id, {
                    password: u.password,
                    email: u.email,
                    email_confirm: true
                });
                if (updateErr) {
                    console.log(`Failed to update GoTrue for ${u.email}:`, updateErr.message);
                } else {
                    console.log(`[UPDATE] Synced GoTrue Password for: ${u.email}`);
                    updated++;
                }
            } else {
                // Identity missing completely! Provision it perfectly mirroring the ID.
                const { error: createErr } = await supabaseService.auth.admin.createUser({
                    id: u.id,
                    email: u.email,
                    password: u.password,
                    email_confirm: true
                });

                if (createErr) {
                    if (createErr.message.includes('already registered')) {
                        console.log(`[CONFLICT] Email ${u.email} belongs to another ID!`);
                        // Delete the orphaned GoTrue account using this email to clear the way? 
                        // For now just log it.
                    } else {
                        console.log(`Failed to create GoTrue for ${u.email}:`, createErr.message);
                    }
                } else {
                    console.log(`[CREATED] Provisioned GoTrue Identity for: ${u.email}`);
                    created++;
                }
            }
        } catch (e) {
            console.error(`Exception on user ${u.email}:`, e.message);
        }
    }

    console.log(`\\nSync Complete: Created ${created} new identities, Updated ${updated} passwords, Skipped ${skipped}.`);
}

syncPasswords().catch(console.error);
