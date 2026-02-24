require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function fixMismatches() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: publicUsers } = await supabase.from('users').select('id, username, email');
    const authQuery = await supabase.auth.admin.listUsers();
    // In a real prod environment we'd paginate but for 75 users this might catch most of them. 
    // Wait, let's fetch all auth users by paginating just in case.
    let authUsers = [];
    let page = 1;
    while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !data.users.length) break;
        authUsers.push(...data.users);
        page++;
    }

    console.log(`Found ${publicUsers.length} public users and ${authUsers.length} auth users`);

    let mismatches = 0;
    for (let pu of publicUsers) {
        const au = authUsers.find(a => a.id === pu.id);
        if (au && au.email !== pu.email) {
            console.log(`Mismatch for ${pu.username}: Public(${pu.email}) vs Auth(${au.email})`);
            mismatches++;
            // Fix it by updating auth.users to match public.users
            const { error: updateError } = await supabase.auth.admin.updateUserById(pu.id, {
                email: pu.email,
                email_confirm: true // auto-confirm since it's an administrative sync
            });
            if (updateError) {
                console.error(`Failed to update ${pu.username}:`, updateError.message);
            } else {
                console.log(`✅ Synced auth email for ${pu.username} to ${pu.email}`);
            }
        }
    }
    console.log(`Total mismatches fixed: ${mismatches}`);
}
fixMismatches().catch(console.error);
