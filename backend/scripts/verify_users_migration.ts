
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// New IDs (extracted from users_uuid_migration_v5.sql)
const NEW_IDS = [
    "0f3526c4-f8b0-460a-b649-c435434f2ea4",
    "447524e8-d20e-4698-b3bd-30257f31d600",
    "5ed14837-4427-42d8-8496-8e7bbcf92ffd",
    "e5eda31e-e99d-41e1-ad7d-0b0d5a506db4"
];

const OLD_IDS = [
    "u-1766828589838",
    "u-1767098315400",
    "u-teamleader-001",
    "u-admin-001"
];

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync('verification_result.txt', msg + '\n');
}

async function verify() {
    fs.writeFileSync('verification_result.txt', `VERIFICATION START ${new Date().toISOString()}\n`);
    log("--- VERIFYING USERS MIGRATION ---");

    // 1. Check Old IDs Gone
    const { count: oldCount, error: oldErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .in('id', OLD_IDS);

    if (oldErr) {
        if (oldErr.message.includes('invalid input syntax') || oldErr.message.includes('uuid')) {
            log("✅ Old Legacy IDs query failed with Type Mismatch (Expected: Column is now UUID).");
        } else {
            log(`Error checking old IDs: ${oldErr.message}`);
        }
    }
    else if (oldCount === 0) log("✅ Old Legacy IDs are GONE (0 found).");
    else log(`❌ FOUND ${oldCount} OLD IDs REMAINING! Migration skipped?`);

    // 2. Check New IDs Exist
    const { count: newCount, error: newErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .in('id', NEW_IDS);

    if (newErr) log(`Error checking new IDs: ${newErr.message}`);
    else if (newCount === 4) log("✅ New UUIDs found (4/4).");
    else log(`❌ FOUND ONLY ${newCount}/4 New UUIDs. Migration incomplete?`);

    // 3. Test Default Value (Insert without ID)
    log("--- DEFAULT VALUE TEST ---");
    const testUser = {
        username: `verify_uuid_${Date.now()}`,
        name: 'Verification User', // Added required field
        role: 'Logistics', // Valid role - adjust as needed
        status: 'Active'
    };

    const { data, error } = await supabase.from('users').insert(testUser).select();

    if (error) {
        log(`❌ INSERT Test Failed: ${error.message}`);
        log("   (Did you forget to add DEFAULT gen_random_uuid()?)");
    } else {
        if (data && data.length > 0) {
            log(`✅ INSERT Test Passed. Generated ID: ${data[0].id}`);
            // Cleanup
            await supabase.from('users').delete().eq('id', data[0].id);
            log("   (Test user cleaned up)");
        } else {
            log("❌ INSERT Test Failed: No data returned.");
        }
    }
}

verify();
