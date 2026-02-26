
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const targets = [
    { table: 'members', pks: ['id_uuid'] },
    { table: 'ministry_events', pks: ['id_uuid'] },
    { table: 'pickup_stations', pks: ['id_uuid'], fks: ['event_id_uuid'] },
    { table: 'vehicles', pks: ['id_uuid'], fks: ['station_id_uuid', 'event_id_uuid'] },
    { table: 'passengers', pks: ['id_uuid'], fks: ['vehicle_id_uuid', 'event_id_uuid'] },
    { table: 'service_attendance', fks: ['member_id_uuid', 'service_id_uuid'] },
    { table: 'volunteer_attendance', fks: ['service_id_uuid'] },
    { table: 'incidents', fks: ['service_id_uuid'] },
    { table: 'souls', fks: ['event_id_uuid', 'station_id_uuid', 'vehicle_id_uuid'] },
    { table: 'personal_vehicles', fks: ['current_service_id_uuid'] }
];

async function verifyMigration() {
    console.log('--- UUID Shadow Migration Audit ---');

    for (const t of targets) {
        const { count: total, error: totalErr } = await supabase.from(t.table).select('*', { count: 'exact', head: true });
        if (totalErr) {
            console.error(`Error querying ${t.table}:`, totalErr.message);
            continue;
        }

        const columns = [...(t.pks || []), ...(t.fks || [])];

        console.log(`\nTable: ${t.table} (Total Rows: ${total})`);

        for (const col of columns) {
            const { count: populated, error: popErr } = await supabase.from(t.table).select('*', { count: 'exact', head: true }).not(col, 'is', null);
            if (popErr) {
                console.error(`  - Column ${col}: Error querying Populated count`);
                continue;
            }

            const percent = total && total > 0 ? ((populated || 0) / total * 100).toFixed(1) : '0.0';
            console.log(`  - Column ${col}: ${populated}/${total} populated (${percent}%)`);
        }
    }
}

verifyMigration();
