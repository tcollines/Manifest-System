const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://poazorjmzswectxvakzl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYXpvcmptenN3ZWN0eHZha3psIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgxMTI2OCwiZXhwIjoyMDgyMzg3MjY4fQ.glE5WryFIWPufnm0jZziS2DCY2vfnPAiTrdpdbmc6Cw'
);

async function run() {
    console.log("--- SQL LOGIN DIAGNOSTICS ---");

    // 1. Orphan Checks - Are there public.users without auth.users?
    console.log("\\n--- 1. Global Orphan Check (public.users vs auth.users) ---");
    const { data: publicUsers } = await supabase.from('users').select('id, username, email');
    const authQuery = await supabase.auth.admin.listUsers();
    const authUsers = authQuery.data?.users || [];

    const authIds = new Set(authUsers.map(u => u.id));
    const orphans = publicUsers?.filter(pu => !authIds.has(pu.id)) || [];

    if (orphans.length > 0) {
        console.log(`❌ Found ${orphans.length} orphaned users in public.users:`);
        console.log(orphans.slice(0, 5));
    } else {
        console.log("✅ No orphaned users found. Perfect parity.");
    }

    // 2. Email confirmation check
    console.log("\\n--- 2. Unconfirmed Emails Check ---");
    const unconfirmed = authUsers.filter(u => !u.email_confirmed_at);
    if (unconfirmed.length > 0) {
        console.log(`❌ Found ${unconfirmed.length} unconfirmed auth users (might block login):`);
        console.log(unconfirmed.slice(0, 5).map(u => ({ id: u.id, email: u.email })));
    } else {
        console.log("✅ All auth emails are confirmed.");
    }
}

run().catch(console.error);
