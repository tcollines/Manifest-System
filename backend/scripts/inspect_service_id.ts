import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function inspectEvent() {
    const { data: events } = await supabase.from('ministry_events').select('id, title, type').or('id.eq.S378,title.eq.S378');
    console.log('Events matching S378:', events);
}

inspectEvent();
