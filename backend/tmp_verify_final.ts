
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check(val: string) {
    const { data: exact } = await supabase.from('users').select('username, email').or(`username.eq."${val}",email.eq."${val}"`).neq('status', 'Deleted').limit(1);
    if (exact && exact.length > 0) { console.log(`[EXACT] "${val}" -> ${exact[0].username} (${exact[0].email})`); return; }
    const { data: fallback } = await supabase.from('users').select('username, email').or(`username.ilike."${val}",email.ilike."${val}"`).neq('status', 'Deleted').limit(1);
    if (fallback && fallback.length > 0) { console.log(`[FALLBACK] "${val}" -> ${fallback[0].username} (${fallback[0].email})`); return; }
    console.log(`[NONE] "${val}"`);
}

async function run() {
    await check('Harriet');
    await check('harriet');
    await check('francism');
    await check('Francis');
}
run();
