
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check(val) {
    const { data: exact } = await supabase.from('users').select('username, email').or(`username.eq."${val}",email.eq."${val}"`).neq('status', 'Deleted').limit(1);
    if (exact && exact.length > 0) return { input: val, type: 'EXACT', username: exact[0].username, email: exact[0].email };
    const { data: fallback } = await supabase.from('users').select('username, email').or(`username.ilike."${val}",email.ilike."${val}"`).neq('status', 'Deleted').limit(1);
    if (fallback && fallback.length > 0) return { input: val, type: 'FALLBACK', username: fallback[0].username, email: fallback[0].email };
    return { input: val, type: 'NONE' };
}

async function run() {
    const vals = ['Harriet', 'harriet', 'francism', 'Francis'];
    const results = [];
    for (const v of vals) {
        results.push(await check(v));
    }
    fs.writeFileSync('final_verify_js.json', JSON.stringify(results, null, 2));
    console.log("Results written to final_verify_js.json");
}

run().catch(err => {
    fs.writeFileSync('final_verify_js.json', JSON.stringify({ error: err.message, stack: err.stack }));
});
