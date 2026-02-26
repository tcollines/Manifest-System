import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function listEvents() {
    console.log('Listing last 50 ministry events...');

    const { data, error } = await supabase
        .from('ministry_events')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

    if (error) { console.error(error); return; }

    data?.forEach(e => {
        console.log(`- ID: ${e.id} | Date: ${e.date} | Title: ${e.title || e.name} | Type: ${e.type}`);
    });
}

listEvents();
