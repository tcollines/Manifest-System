
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkInvalidSouls() {
    console.log("Checking for orphaned Soul records...");

    // 1. Fetch all souls with relevant source_types
    const { data: souls, error: soulsError } = await supabase
        .from('souls')
        .select('id, source_type, source_id, first_name, last_name')
        .in('source_type', ['Event', 'Service']);

    if (soulsError) {
        console.error("Error fetching souls:", soulsError.message);
        return;
    }

    // 2. Fetch all Ministry Event IDs
    const { data: events, error: eventsError } = await supabase
        .from('ministry_events')
        .select('id');

    if (eventsError) {
        console.error("Error fetching events:", eventsError.message);
        return;
    }

    const eventIds = new Set(events.map(e => e.id));
    const orphans: any[] = [];

    // 3. Find matches
    for (const soul of souls) {
        if (soul.source_id && !eventIds.has(soul.source_id)) {
            orphans.push(soul);
        }
    }

    console.log(`Total Souls checked: ${souls.length}`);
    console.log(`Orphaned Souls found: ${orphans.length}`);

    if (orphans.length > 0) {
        console.log("Example Orphans:");
        console.table(orphans.slice(0, 5));
    }
}

checkInvalidSouls();
