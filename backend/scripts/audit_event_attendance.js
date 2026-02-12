
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { return; }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- AUDIT EVENT ATTENDANCE (JS) ---');
    // 1. Get non-Service events
    const { data: nonService } = await supabase.from('ministry_events').select('id,title,type').neq('type', 'Service');

    if (!nonService || nonService.length === 0) {
        console.log('No non-service events found.');
        return;
    }

    const ids = nonService.map(e => e.id);
    const { data: att } = await supabase.from('service_attendance').select('member_id').in('service_id', ids);

    const count = att ? att.length : 0;
    const unique = new Set(att?.map(a => a.member_id)).size;

    console.log(`Found ${nonService.length} non-Service events.`);
    console.log(`Examples: ${nonService.slice(0, 3).map(e => e.title).join(', ')}`);
    console.log(`Total Attendance Records for these: ${count}`);
    console.log(`Unique Members Affected: ${unique}`);
}

run();
