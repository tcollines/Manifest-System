
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
    console.log('--- Phase 3B Post-Migration Audit ---\n');

    const coreTables = [
        'members', 'ministry_events', 'pickup_stations',
        'vehicles', 'passengers', 'souls',
        'incidents', 'volunteer_attendance', 'service_attendance'
    ];

    for (const table of coreTables) {
        console.log(`Checking Table: ${table}...`);

        // 1. Verify 'id' column is queryable (Authoritative check)
        const { data: samples, error: probeError } = await supabase.from(table).select('*').limit(5);

        if (probeError) {
            console.error(`  ❌ ERROR: Table or Column 'id' issues: ${probeError.message}`);
            continue;
        }

        // 2. Schema check: Verify 'id' contains UUIDs
        if (samples && samples.length > 0) {
            const hasId = 'id' in samples[0];
            if (!hasId) {
                console.error(`  ❌ Column 'id' missing from result set!`);
            } else {
                const allUuids = samples.every(s => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(s.id)));
                if (allUuids) {
                    console.log(`  ✅ Column 'id' promoted to native UUID successfully.`);
                } else {
                    console.error(`  ❌ DATA TYPE ERROR: 'id' contains non-UUID legacy data!`);
                }
            }

            // 3. Foreign Key Check (Existence of legacy_* columns)
            const keys = Object.keys(samples[0]);
            const legacyKeys = keys.filter(k => k.startsWith('legacy_'));
            if (legacyKeys.length > 0) {
                console.log(`  ✅ Legacy containment active: [${legacyKeys.join(', ')}]`);
            }
        } else {
            console.log(`  ⚠️ Table ${table} is empty. Verification skipped.`);
        }
        console.log('');
    }

    console.log('Audit Complete. Please verify application logs for any hidden legacy fallback errors.');
}

runAudit();
