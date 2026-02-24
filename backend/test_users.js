const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('d:\\Manifest System\\backend\\.env', 'utf8');
const getEnv = (key) => {
    const match = env.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
};
const url = getEnv('SUPABASE_URL');
const key = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_ANON_KEY');

const supabase = createClient(url, key);

async function run() {
    console.log("Fetching users to find duplicates...");
    const { data: users, error: err } = await supabase.from('users').select('id, email, name, role');
    if (err) {
        console.error("Error:", err);
        return;
    }

    const emails = users.map(u => u.email).filter(Boolean);
    const duplicates = emails.filter((e, i, a) => a.indexOf(e) !== i);
    const uniqueDupes = [...new Set(duplicates)];

    console.log("Duplicates:");
    uniqueDupes.forEach(dup => {
        const records = users.filter(u => u.email === dup);
        console.log(`Email: ${dup}`);
        records.forEach(r => console.log(`  ID: ${r.id}, Name: ${r.name}, Role: ${r.role}`));
    });

    console.log("\nExecuting schema query to find foreign keys pointing to users...");
    const { data: fkData, error: fkErr } = await supabase.rpc('query_foreign_keys_to_users');
    // Since we don't have this RPC, we will try to query information_schema via direct DB if possible.
    // We can just try to delete a dummy user and see the error code.

    const tempId = '00000000-0000-0000-0000-000000000000';
    await supabase.from('users').insert([{ id: tempId, name: 'dummy', role: 'dummy', manifest_id: 'tcollines/Manifest-System' }]);
    const { error: delErr } = await supabase.from('users').delete().eq('id', tempId);
    console.log("Delete error normally:", delErr);
}
run();
