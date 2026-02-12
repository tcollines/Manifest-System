
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { return; }

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHistory() {
    console.log('--- CHECKING 2026 MEMBERS HISTORY ---');

    const { data: members, error } = await supabase
        .from('members')
        .select('id, category, first_timer_service_id')
        .not('category', 'in', '("Next Gen","Child","Children")') // Adult only
        .gte('joined_date', '2026-01-01');

    if (error) { console.error(error); return; }

    const total = members.length;
    const promotedWithId = members.filter(m => m.category === 'Member' && m.first_timer_service_id).length;
    const promotedWithoutId = members.filter(m => m.category === 'Member' && !m.first_timer_service_id).length;
    const stillFirstTimer = members.filter(m => m.category === 'First Timer').length;

    console.log(`Total 2026 Joiners: ${total}`);
    console.log(`Still 'First Timer': ${stillFirstTimer}`);
    console.log(`Promoted to 'Member' (With FT Service ID): ${promotedWithId}`);
    console.log(`Direct 'Member' (No FT Service ID): ${promotedWithoutId}`);
}

checkHistory();
