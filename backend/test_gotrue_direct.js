require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testSupabaseAuth() {
    try {
        const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
        if (!anonKey) throw new Error("Missing ANON KEY");

        const supabaseAnon = createClient(process.env.SUPABASE_URL, anonKey);
        const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        const { data: users, error: dbErr } = await supabaseService.from('users').select('username, email, password').not('username', 'is', null).not('password', 'is', null).not('password', 'like', 'PENDING_%').neq('status', 'Deleted');
        if (dbErr) throw new Error(dbErr.message);
        let results = [];
        for (const u of users) {
            if (!u.username || u.password.startsWith('PENDING_') || !u.email) continue;

            const { data, error } = await supabaseAnon.auth.signInWithPassword({
                email: u.email,
                password: u.password
            });

            results.push({
                username: u.username,
                email: u.email,
                success: !error,
                error: error ? error.message : null
            });
        }

        fs.writeFileSync('gotrue_results.json', JSON.stringify(results, null, 2));
        console.log("Wrote gotrue_results.json");
    } catch (err) {
        fs.writeFileSync('gotrue_results.json', JSON.stringify({ error: err.message, stack: err.stack }));
    }
}

testSupabaseAuth().catch(err => {
    fs.writeFileSync('gotrue_results.json', JSON.stringify({ error: err.message }));
});
