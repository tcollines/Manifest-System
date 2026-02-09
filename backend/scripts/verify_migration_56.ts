import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verifyMigration() {
    console.log('Verifying Migration 56...');

    // 1. Check for remaining legacy IDs
    const { data: legacyIds, error: legacyError } = await supabase
        .from('members')
        .select('id')
        .ilike('id', 'm-%'); // Assuming m- prefix

    if (legacyError) {
        console.error('Error checking legacy IDs:', legacyError);
    } else {
        console.log(`Remaining Legacy IDs: ${legacyIds?.length}`);
        if (legacyIds && legacyIds.length > 0) {
            console.warn('WARNING: Not all IDs migrated.');
            console.log('Sample:', legacyIds.slice(0, 5));
        } else {
            console.log('SUCCESS: No legacy IDs found in ID column.');
        }
    }

    // 2. Check for legacy_id population
    const { count, error: countError } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .not('legacy_id', 'is', null);

    if (countError) {
        console.error('Error checking legacy_id column:', countError);
    } else {
        console.log(`Members with populated legacy_id: ${count}`);
    }

    // 3. Integrity Check: Service Attendance
    // Pick a random service attendance record and check if member exists
    const { data: attendance, error: attError } = await supabase
        .from('service_attendance')
        .select('member_id')
        .limit(5);

    if (attError) console.error('Error checking attendance:', attError);
    else {
        console.log('Checking 5 random attendance records for valid member links...');
        for (const att of attendance || []) {
            const { data, error } = await supabase.from('members').select('id').eq('id', att.member_id).single();
            if (error || !data) {
                console.error(`ORPHAN DETECTED: Service Attendance points to ${att.member_id} which does not exist in members.`);
            } else {
                console.log(`Verified: ${att.member_id} exists.`);
            }
        }
    }

}

verifyMigration();
