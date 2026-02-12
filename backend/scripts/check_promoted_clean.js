
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- CHECK ---');
    const { data: members } = await supabase
        .from('members')
        .select('id, category, first_timer_service_id')
        .gte('joined_date', '2026-01-01');

    const total = members.length;
    const ft = members.filter(m => m.category === 'First Timer').length;
    const memWithId = members.filter(m => m.category === 'Member' && m.first_timer_service_id).length;
    const memNoId = members.filter(m => m.category === 'Member' && !m.first_timer_service_id).length;

    console.log(`Total: ${total}`);
    console.log(`FT: ${ft}`);
    console.log(`Mem (Promoted): ${memWithId}`);
    console.log(`Mem (Direct/Null ID): ${memNoId}`);
}
check();
