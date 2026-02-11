
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const auditTargets = [
    { table: 'vehicles', idCol: 'id', uuidCol: 'id_uuid' },
    { table: 'personal_vehicles', idCol: 'id', uuidCol: 'current_service_id_uuid' }, // Note: PV doesn't have id_uuid yet, only current_service_id_uuid
    { table: 'souls', idCol: 'id', uuidCol: 'event_id_uuid' } // Auditing missing event links
];

async function runAudit() {
    console.log('--- Stage 2A: Data Quality Audit (Legacy ID Gaps) ---\n');

    for (const target of auditTargets) {
        console.log(`Checking ${target.table}...`);

        // Find rows where the shadow uuid column is NULL
        const { data, error, count } = await supabase
            .from(target.table)
            .select(`${target.idCol}, ${target.uuidCol}`, { count: 'exact' })
            .is(target.uuidCol, null);

        if (error) {
            console.error(`  Error auditing ${target.table}:`, error.message);
            continue;
        }

        if (count && count > 0) {
            console.log(`  ❌ Found ${count} legacy records missing UUID mapping.`);
            console.log(`  Sample legacy IDs:`, data?.slice(0, 5).map(r => (r as any)[target.idCol]));
        } else {
            console.log(`  ✅ All records in ${target.table} are mapped to UUID.`);
        }
        console.log('');
    }
}

runAudit();
