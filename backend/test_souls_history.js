require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    const { data: souls, error: soulsError } = await supabase.from('souls').select('*').limit(1);
    console.log('Souls Schema:', souls?.[0]);

    const { data: attendees, error: attErr } = await supabase.from('ministry_events_attendees').select('*').limit(1);
    console.log('Attendees Schema:', attendees?.[0]);
}

checkSchema().catch(console.error);
