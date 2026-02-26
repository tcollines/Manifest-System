
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
    console.log('Starting Full System UUID Audit...');

    // 1. Get All Tables (Try querying information_schema)
    // Note: RLS might block this on client side, but SERVICE_KEY should bypass.
    // We can't use .from('information_schema.tables').select('*') directly with postgrest usually unless exposed.
    // Instead, we'll try a list of known probable tables if we can't dynamic query, 
    // BUT let's try to query a known accessible endpoint or just use a very comprehensive list.

    // Comprehensive list based on file system observation:
    const knownTables = [
        'members',
        'service_attendance',
        'users',
        'departments',
        'ministry_events',
        'souls',
        'requisitions',
        'pickup_stations',
        'vehicles',
        'incident_reports',
        'monitoring_reports',
        'report_submissions',
        'school_outreach_reports',
        'children',
        'personal_vehicles',
        'next_gen_souls',
        'passengers',
        'vehicle_assignments',
        'requisition_items',
        'requisition_payments',
        'invitations',
        'volunteer_attendance',
        'transactions'
    ];

    const confirmedTables: string[] = [];

    for (const t of knownTables) {
        const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
        if (!error) {
            confirmedTables.push(t);
        }
    }

    console.log(`\n=== 1. DATABASE AUDIT (${confirmedTables.length} tables found) ===\n`);

    for (const table of confirmedTables) {
        // Fetch a sample to guess columns if we can't get metadata
        const { data: sample } = await supabase.from(table).select('*').limit(1);
        let columnsToAudit = ['id'];

        if (sample && sample.length > 0) {
            const keys = Object.keys(sample[0]);
            // Audit IDs, FKs, and legacy columns
            const relevant = keys.filter(k =>
                k === 'id' ||
                k.endsWith('_id') ||
                k.includes('legacy')
            );
            columnsToAudit = [...new Set([...columnsToAudit, ...relevant])];
        } else {
            columnsToAudit = ['id', 'event_id', 'member_id', 'service_id', 'department_id', 'legacy_id'];
        }

        for (const col of columnsToAudit) {
            // Fetch data for column
            const { data: rows, error: errRows } = await supabase
                .from(table)
                .select(col);

            if (errRows || !rows) continue;

            let validUuid = 0;
            let legacyD = 0;   // ^d\d+$
            let legacyEvt = 0; // ^evt-
            let legacyMem = 0; // ^mem-
            let legacyP = 0;   // ^p-
            let legacyPv = 0;  // ^pv-
            let other = 0;
            let nulls = 0;
            const total = rows.length;

            if (total === 0) continue;

            const samples: string[] = [];

            for (const r of rows) {
                const val = r[col];
                if (val === null) {
                    nulls++;
                    continue;
                }

                const str = String(val);
                if (samples.length < 3) samples.push(str);

                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
                    validUuid++;
                } else if (/^d\d+$/.test(str)) {
                    legacyD++;
                } else if (str.startsWith('evt-')) {
                    legacyEvt++;
                } else if (str.startsWith('mem-') || str.startsWith('m-')) { // Catch m- too just in case
                    legacyMem++;
                } else if (str.startsWith('p-')) {
                    legacyP++;
                } else if (str.startsWith('pv-')) {
                    legacyPv++;
                } else {
                    other++;
                }
            }

            // Report if interesting
            const nonUuid = legacyD + legacyEvt + legacyMem + legacyP + legacyPv + other;
            if (total > 0) {
                console.log(`[TABLE: ${table}] [COL: ${col}] `);
                console.log(`   Total: ${total}, Nulls: ${nulls}`);
                console.log(`   UUID: ${validUuid} (${((validUuid / total) * 100).toFixed(1)}%)`);
                if (nonUuid > 0) {
                    console.log(`   ⚠️ NON-UUID: ${nonUuid}`);
                    if (legacyD > 0) console.log(`      - Dept IDs (d*): ${legacyD}`);
                    if (legacyEvt > 0) console.log(`      - Event IDs (evt-*): ${legacyEvt}`);
                    if (legacyMem > 0) console.log(`      - Member IDs (mem-*): ${legacyMem}`);
                    if (legacyP > 0) console.log(`      - Passenger IDs (p-*): ${legacyP}`);
                    if (legacyPv > 0) console.log(`      - Personal Vehicle IDs (pv-*): ${legacyPv}`);
                    if (other > 0) console.log(`      - Other/Text: ${other}`);
                    console.log(`   Samples: ${samples.join(', ')}`);
                }
                console.log('');
            }
        }
    }
}

runAudit();
