
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function listEvents() {
    console.log("Listing Recent Events...");

    const { data: events } = await supabase
        .from('ministry_events')
        .select('id, title, date, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log(events);
}

listEvents();
