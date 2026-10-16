require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Fetching auth.users...");
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 10000 });
    if (authError) return console.error(authError);
    const authIds = new Set(authData.users.map(u => u.id));

    console.log("Fetching public.users...");
    const { data: publicData, error: pubError } = await supabase.from('users').select('id, username');
    if (pubError) return console.error(pubError);
    const pubIds = new Set(publicData.map(u => u.id));

    let mismatches = [];

    // Check public missing in auth
    for (let pid of pubIds) {
        if (!authIds.has(pid)) mismatches.push({ public_id: pid, auth_id: null });
    }

    // Check auth missing in public
    for (let aid of authIds) {
        if (!pubIds.has(aid)) mismatches.push({ public_id: null, auth_id: aid });
    }

    console.log(`--- 1. UUID PARITY CHECK ---`);
    console.log(`Parity mismatches found: ${mismatches.length}`);
    if (mismatches.length > 0) {
        console.log("Sample mismatches:");
        console.log(mismatches.slice(0, 5));
    }

    console.log(`--- 2. DUPLICATE USERNAMES CHECK ---`);
    const counts = {};
    publicData.forEach(u => {
        if (u.username) counts[u.username] = (counts[u.username] || 0) + 1;
    });
    const dups = Object.entries(counts).filter(([k, v]) => v > 1);
    console.log(`Duplicate usernames found: ${dups.length}`);
    if (dups.length > 0) {
        console.log(dups);
    }
}
run().catch(console.error);
