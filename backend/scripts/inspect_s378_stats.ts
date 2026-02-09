import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function inspectStats() {
    const id = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    console.log(`Inspecting stats for S378 (UUID: ${id})...`);

    const { data, error } = await supabase
        .from('ministry_events')
        .select('stats, date, title, code')
        .eq('id', id)
        .single();

    if (error) { console.error(error); return; }

    console.log('Event Info:');
    console.log(JSON.stringify(data, null, 2));
}

inspectStats();
