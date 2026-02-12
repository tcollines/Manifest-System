
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { toUUID } from '../src/utils/uuid'; // Ensure we can access this or duplicate logic if not compilable easily in script

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function monitorSync() {
    console.log('--- MONITORING PARKING SYNC (SOAK CHECK) ---');

    // Fetch recently checked-in vehicles
    // Assuming 'check_in_time' is the field updated
    const { data: vehicles, error } = await supabase
        .from('personal_vehicles')
        .select('*')
        .order('check_in_time', { ascending: false })
        .limit(10); // Check last 10

    if (error) {
        console.error("Error fetching vehicles:", error.message);
        return;
    }

    if (!vehicles || vehicles.length === 0) {
        console.log("No recent check-ins found.");
        return;
    }

    console.log(`Checking last ${vehicles.length} records...`);

    let syncCount = 0;
    let mismatchCount = 0;

    for (const v of vehicles) {
        const textId = v.current_service_id;
        const uuidId = v.current_service_id_uuid;
        const checkIn = v.check_in_time;

        // Logic: UUID(textId) should equal uuidId
        // handle nulls
        if (!textId && !uuidId) {
            console.log(`[${checkIn}] OK (Both Null) - ID: ${v.id}`);
            syncCount++;
            continue;
        }

        if ((!textId && uuidId) || (textId && !uuidId)) {
            console.error(`[${checkIn}] MISMATCH (One Null) - Text: ${textId}, UUID: ${uuidId} - ID: ${v.id}`);
            mismatchCount++;
            continue;
        }

        // Both present
        const derivedUuid = toUUID(textId);
        if (derivedUuid === uuidId) {
            console.log(`[${checkIn}] OK (Synced) - ID: ${v.id}`);
            syncCount++;
        } else {
            console.error(`[${checkIn}] MISMATCH - Text: ${textId} -> Derived: ${derivedUuid} != DB UUID: ${uuidId} - ID: ${v.id}`);
            mismatchCount++;
        }
    }

    console.log(`--- SUMMARY ---`);
    console.log(`Synced: ${syncCount}`);
    console.log(`Mismatches: ${mismatchCount}`);
    if (mismatchCount === 0) {
        console.log("STATUS: PASS - Data consistency verified.");
    } else {
        console.log("STATUS: WARN - Inconsistencies detected.");
    }
}

monitorSync();
