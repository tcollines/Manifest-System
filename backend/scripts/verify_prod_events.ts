
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyEvents() {
    console.log('--- VERIFYING EVENT IDs ---');

    const id1 = '52a9bb33-abce-4fdb-8c72-a02b30babf93';
    const id2 = '034b6944-df96-4948-a9bb-a498798d846e';

    const { data: events, error } = await supabase
        .from('ministry_events')
        .select('id, title, date')
        .in('id', [id1, id2]);

    if (error) {
        console.error("Error fetching events:", error.message);
    } else {
        console.log("Found Events:");
        console.table(events);
    }

    // Check recent events to see if we see any other weirdness
    const { data: recent } = await supabase
        .from('ministry_events')
        .select('id, title, date')
        .order('date', { ascending: false })
        .limit(5);

    console.log("Recent Events:");
    console.table(recent);
}

verifyEvents();
