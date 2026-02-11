
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
        'vehicle_assignments', // inferred
        'requisition_items',
        'requisition_payments',
        'invitations'
    ];

    // We will try to confirm existence by selecting 1 row.
    const confirmedTables: string[] = [];

    for (const t of knownTables) {
        const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
        if (!error) {
            confirmedTables.push(t);
        } else {
            // console.error(`Table ${t} not accessible or does not exist: ${error.message}`);
        }
    }

    const results: any[] = [];

    for (const table of confirmedTables) {
        // Get one row to find columns? Or just audit 'id' and 'source_id', 'event_id', 'member_id'
        // Without metadata access, we have to guess columns or fetch a row to see keys.
        const { data: sample, error: errSample } = await supabase.from(table).select('*').limit(1);

        let columnsToAudit = ['id']; // Always check ID

        if (sample && sample.length > 0) {
            const keys = Object.keys(sample[0]);
            const fkCols = keys.filter(k => k.endsWith('_id'));
            columnsToAudit = [...new Set([...columnsToAudit, ...fkCols])];
        } else {
            // If empty table, we can't discover columns easily without metadata. 
            // We'll just check 'id' and common ones.
            columnsToAudit = ['id', 'event_id', 'member_id', 'service_id', 'department_id'];
        }

        for (const col of columnsToAudit) {
            // Fetch all data for this column
            const { data: rows, error: errRows } = await supabase
                .from(table)
                .select(col);

            if (errRows) {
                // Column might not exist
                continue;
            }

            let validUuid = 0;
            let legacyD = 0;
            let legacyEvt = 0;
            let legacyM = 0;
            let other = 0;
            let total = 0;

            const values = rows.map((r: any) => r[col]).filter(v => v !== null); // Filter nulls
            total = values.length;

            for (const val of values) {
                const str = String(val);
                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
                    validUuid++;
                } else if (str.startsWith('d') && !isNaN(parseInt(str.substring(1)))) {
                    legacyD++;
                } else if (str.startsWith('evt-')) {
                    legacyEvt++;
                } else if (str.startsWith('m-')) {
                    legacyM++;
                } else {
                    other++;
                }
            }


            if (total > 0 || columnsToAudit.includes(col)) { // Only report if we found data or it's the ID column
                results.push({
                    Table: table,
                    Column: col,
                    TotalRows: total,
                    'Valid UUIDs': validUuid,
                    'Legacy (d*)': legacyD,
                    'Legacy (evt-*)': legacyEvt,
                    'Legacy (m-*)': legacyM,
                    'Other/Invalid': other
                });
            }
        }
    }

    results.forEach(r => {
        console.log(`DATA::::${r.Table}::${r.Column}::TOTAL=${r.TotalRows}::UUID=${r['Valid UUIDs']}::D=${r['Legacy (d*)']}::EVT=${r['Legacy (evt-*)']}::M=${r['Legacy (m-*)']}::OTHER=${r['Other/Invalid']}`);
    });
}

runAudit();
