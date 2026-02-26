
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillFirstTimers() {
    console.log('--- BACKFILL FIRST TIMERS ---');

    // 1. Fetch First Timers with missing service ID
    const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .eq('category', 'First Timer')
        .is('first_timer_service_id', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching members:", error.message);
        return;
    }

    if (!members || members.length === 0) {
        console.log("No First Timers needing backfill.");
        return;
    }

    console.log(`Found ${members.length} records to backfill...`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const m of members) {
        const id = m.id;
        const attended = m.attended_service_ids; // JSONB array of strings/UUIDs

        if (!attended || !Array.isArray(attended) || attended.length === 0) {
            console.warn(`[SKIP] Member ${m.name} (${id}) has no attendance history.`);
            skippedCount++;
            continue;
        }

        // Logic: Take the FIRST service ID from the array as their "First Timer Service"
        // This assumes the array order or that the first one is relevant.
        // Ideally we should check 'service_attendance' table for the earliest date, but the array is a good proxy for now.
        const candidateId = attended[0];

        // Ensure it's not null/empty
        if (!candidateId) {
            skippedCount++;
            continue;
        }

        console.log(`[UPDATE] Member ${m.name} (${id}) -> Setting First Timer Service: ${candidateId}`);

        const { error: updateError } = await supabase
            .from('members')
            .update({ first_timer_service_id: candidateId })
            .eq('id', id);

        if (updateError) {
            console.error(`   ❌ Failed to update: ${updateError.message}`);
        } else {
            updatedCount++;
        }
    }

    console.log(`--- SUMMARY ---`);
    console.log(`Total Found: ${members.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
}

backfillFirstTimers();
