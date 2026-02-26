
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PK_TABLES = ['members', 'ministry_events', 'pickup_stations', 'vehicles', 'passengers'];
const FK_CHECKS = [
    { table: 'pickup_stations', column: 'event_id_uuid' },
    { table: 'vehicles', column: 'station_id_uuid' },
    { table: 'vehicles', column: 'event_id_uuid' },
    { table: 'passengers', column: 'vehicle_id_uuid' },
    { table: 'passengers', column: 'event_id_uuid' },
    { table: 'service_attendance', column: 'member_id_uuid' },
    { table: 'service_attendance', column: 'service_id_uuid' },
    { table: 'souls', column: 'event_id_uuid' }
];

async function checkGaps() {
    console.log('--- Phase 3B: Pre-Flip Gap Audit ---\n');

    console.log('Checking Primary Key Shadows...');
    for (const table of PK_TABLES) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .is('id_uuid', null);

        if (error) {
            console.error(`Error checking ${table}: ${error.message}`);
        } else {
            console.log(`  Table: ${table} - Missing id_uuid: ${count}`);
        }
    }

    console.log('\nChecking Foreign Key Shadows...');
    for (const check of FK_CHECKS) {
        const { count, error } = await supabase
            .from(check.table)
            .select('*', { count: 'exact', head: true })
            .is(check.column, null);

        if (error) {
            console.error(`Error checking ${check.table}.${check.column}: ${error.message}`);
        } else {
            console.log(`  Table: ${check.table}, Col: ${check.column} - Missing: ${count}`);
        }
    }
}

checkGaps();
