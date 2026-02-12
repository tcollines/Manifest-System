
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { return; }

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRow() {
    console.log('--- INSPECTING ALL KEYS ---');

    const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .eq('category', 'First Timer')
        .limit(1);

    if (error) { console.error(error); return; }
    if (members.length === 0) { console.log('No First Timers found.'); return; }

    const m = members[0];
    const keys = Object.keys(m).sort();

    // Print in chunks if too long or just use simple logging
    console.log('Total Columns:', keys.length);
    console.log(JSON.stringify(keys, null, 2)); // improved formatting
}

inspectRow();
