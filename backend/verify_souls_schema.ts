
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function verifySoulsSchema() {
    console.log("Verifying Souls Table Schema & Data...");

    // 1. Check Columns (via data inspection)
    const { data: sample, error: sampleError } = await supabase
        .from('souls')
        .select('*')
        .limit(1);

    if (sampleError) {
        console.error("Error fetching sample:", sampleError.message);
        return;
    }

    if (sample && sample.length > 0) {
        const keys = Object.keys(sample[0]);
        console.log("Columns found:", keys);
        console.log("Has event_id:", keys.includes('event_id'));
        console.log("Has station_id:", keys.includes('station_id'));
        console.log("Has vehicle_id:", keys.includes('vehicle_id'));
    } else {
        console.log("Souls table is empty.");
    }

    // 2. Check Backfill Stats
    const { count: total, error: cErr } = await supabase
        .from('souls')
        .select('*', { count: 'exact', head: true });

    const { count: withEventId, error: eErr } = await supabase
        .from('souls')
        .select('*', { count: 'exact', head: true })
        .not('event_id', 'is', null);

    console.log(`\nTotal Souls: ${total}`);
    console.log(`Souls with event_id: ${withEventId}`);

    // 3. Verify Orphans Fix
    // Check if records with original source_id 'evt-1769154800040' now have the correct event_id
    const INTER_SCHOOLS_ID = '11324002-c401-494b-be68-179650967970';
    const { data: fixedOrphans, error: fErr } = await supabase
        .from('souls')
        .select('id, event_id, source_id')
        .eq('source_id', 'evt-1769154800040')
        .limit(5);

    if (fixedOrphans && fixedOrphans.length > 0) {
        console.log("\nVerifying fixed orphans:");
        const allMatch = fixedOrphans.every(r => r.event_id === INTER_SCHOOLS_ID);
        if (allMatch) {
            console.log("✅ SUCCESS: Orphans mapped to Inter-Schools Conference.");
        } else {
            console.log("❌ FAILURE: Orphans have incorrect event_id:");
            console.table(fixedOrphans);
        }
    } else {
        console.log("\nNo orphans found to verify (might be 0 if source_id was changed? Script didn't change source_id, just mapped event_id).");
    }
}

verifySoulsSchema();
