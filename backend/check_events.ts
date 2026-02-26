
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkEvents() {
    console.log("Fetching Events...");
    const { data: events, error } = await supabase
        .from('ministry_events')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error("Error:", error);
        return;
    }

    events?.forEach(e => {
        console.log(`[${e.type}] ${e.title} (ID: ${e.id}) - Date: ${e.date}`);
    });
}

checkEvents();
