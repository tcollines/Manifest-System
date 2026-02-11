
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const targets = [
    { table: 'members', columns: ['id'] },
    { table: 'ministry_events', columns: ['id'] },
    { table: 'pickup_stations', columns: ['id', 'event_id'] },
    { table: 'vehicles', columns: ['id', 'station_id', 'event_id'] },
    { table: 'passengers', columns: ['id', 'vehicle_id', 'event_id'] },
    { table: 'service_attendance', columns: ['member_id', 'service_id'] },
    { table: 'volunteer_attendance', columns: ['id', 'service_id'] },
    { table: 'incidents', columns: ['id', 'service_id'] },
    { table: 'souls', columns: ['id', 'event_id', 'station_id', 'vehicle_id'] },
    { table: 'personal_vehicles', columns: ['current_service_id'] }
];

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function checkInvalidStrings() {
    for (const t of targets) {
        console.log(`Checking ${t.table}...`);
        const { data, error } = await supabase.from(t.table).select(t.columns.join(', '));

        if (error) {
            console.error(`Error checking ${t.table}:`, error.message);
            continue;
        }

        if (data) {
            for (const col of t.columns) {
                const invalid = data.filter((row: any) => {
                    const val = row[col];
                    if (val === null || val === undefined) return false;
                    return !uuidRegex.test(val);
                });

                if (invalid.length > 0) {
                    console.log(`❌ Found ${invalid.length} invalid UUIDs in ${t.table}.${col}`);
                    console.log('Sample entries:', invalid.slice(0, 3).map((r: any) => r[col]));
                }
            }
        }
    }
}

checkInvalidStrings();
