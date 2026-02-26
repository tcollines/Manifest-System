
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { return; }

const supabase = createClient(supabaseUrl, supabaseKey);

async function sampleMembers() {
    console.log('--- SAMPLING 5 "MEMBER" RECORDS FROM 2026 (JSON) ---');

    const { data: members, error } = await supabase
        .from('members')
        .select('id, name, joined_date, category, first_timer_service_id')
        .eq('category', 'Member')
        .gte('joined_date', '2026-01-01')
        .limit(5);

    if (error) { console.error(error); return; }

    if (members.length === 0) {
        console.log('No 2026 "Member" records found.');
    } else {
        console.log(JSON.stringify(members, null, 2));
    }
}

sampleMembers();
