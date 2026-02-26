import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function getSchema() {
    console.log('Fetching 1 row from ministry_events to check columns...');
    const { data, error } = await supabase.from('ministry_events').select('*').limit(1);
    if (error) { console.error(error); return; }
    if (data && data.length > 0) {
        console.log('Columns in ministry_events:', Object.keys(data[0]));
        console.log('Sample Data:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No rows in ministry_events.');
    }
}

getSchema();
