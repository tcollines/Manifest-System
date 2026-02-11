
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const CHECKS = [
    { table: 'members', column: 'id' },
    { table: 'ministry_events', column: 'id' },
    { table: 'pickup_stations', column: 'id' },
    { table: 'pickup_stations', column: 'event_id' },
    { table: 'vehicles', column: 'id' },
    { table: 'vehicles', column: 'station_id' },
    { table: 'vehicles', column: 'event_id' },
    { table: 'passengers', column: 'id' },
    { table: 'passengers', column: 'vehicle_id' },
    { table: 'passengers', column: 'event_id' },
    { table: 'service_attendance', column: 'member_id' },
    { table: 'service_attendance', column: 'service_id' },
    { table: 'volunteer_attendance', column: 'service_id' },
    { table: 'incidents', column: 'service_id' },
    { table: 'souls', column: 'event_id' }
];

async function checkHardeningGaps() {
    console.log('--- Phase 3C: Hardening Gap Audit ---\n');

    for (const check of CHECKS) {
        const { count, error } = await supabase
            .from(check.table)
            .select('*', { count: 'exact', head: true })
            .is(check.column, null);

        if (error) {
            console.error(`Error checking ${check.table}.${check.column}: ${error.message}`);
        } else if (count && count > 0) {
            console.log(`[!] ${check.table}.${check.column} - NULL COUNT: ${count}`);

            const { data } = await supabase
                .from(check.table)
                .select(`*`)
                .is(check.column, null)
                .limit(5);

            if (data) {
                console.log(`    Orphan Records:`, JSON.stringify(data, null, 2));
            }
        } else {
            console.log(`[OK] ${check.table}.${check.column} is clean.`);
        }
    }
}

checkHardeningGaps();
