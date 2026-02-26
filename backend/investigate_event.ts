
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function investigateEvent() {
    const orphanedId = 'evt-1769154800040';
    const timestamp = parseInt(orphanedId.replace('evt-', ''));
    const date = new Date(timestamp);

    console.log(`Orphaned ID: ${orphanedId}`);
    console.log(`Derived Date: ${date.toISOString()} (${date.toDateString()})`);

    console.log("\n--- Existing Events ---");
    const { data: events, error } = await supabase
        .from('ministry_events')
        .select('id, title, date, created_at')
        .order('date', { ascending: false });

    if (error) {
        console.error("Error fetching events:", error.message);
        return;
    }

    if (events) {
        console.table(events);

        // Check for matches
        const match = events.find(e => {
            const eDate = new Date(e.date);
            // Check if dates are close (same day)
            return eDate.toDateString() === date.toDateString();
        });

        if (match) {
            console.log(`\nPotential Match found by Date:`);
            console.log(match);
        } else {
            console.log("\nNo direct date match found.");
        }
    }
}

investigateEvent();
