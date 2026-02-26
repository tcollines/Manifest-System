
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { return; }

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
    'children',
    'department_requests',
    'passengers',
    'personal_vehicles',
    'transactions',
    'users',
    'vehicles',
    'pickup_stations',
    'ministry_events',
    'members',
    'service_attendance',
    'souls',
    'incidents'
];

async function runAudit() {
    console.log('--- COMPREHENSIVE UUID AUDIT ---');
    console.log('Timestamp:', new Date().toISOString());
    console.log('--------------------------------');

    const report = {};

    for (const table of TABLES) {
        console.log(`Auditing ${table}...`);
        report[table] = {
            total_rows: 0,
            uuid_pk_compliant: true, // Optimistic default
            legacy_columns: [],
            legacy_usage: {}
        };

        // 1. Check Row Count & Sample
        const { data: sample, count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact' })
            .limit(5);

        if (error) {
            console.error(`Error accessing ${table}:`, error.message);
            report[table].error = error.message;
            continue;
        }

        report[table].total_rows = count;

        if (count === 0) continue;

        // 2. Check PK format (Naive check on first row 'id')
        const firstId = sample[0].id;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstId);

        // Special case for 'transactions' or others that might not use 'id' as PK or use different format?
        // Assuming standard schema unless proven otherwise.
        report[table].uuid_pk_compliant = isUuid;

        // 3. Find Legacy Columns (keys starting with 'legacy_')
        const keys = Object.keys(sample[0]);
        const legacyCols = keys.filter(k => k.startsWith('legacy_'));
        report[table].legacy_columns = legacyCols;

        // 4. Check Usage of Legacy Columns (Count non-nulls)
        for (const col of legacyCols) {
            const { count: usageCount } = await supabase
                .from(table)
                .select(col, { count: 'exact', head: true })
                .not(col, 'is', null);

            report[table].legacy_usage[col] = usageCount;
        }

        // 5. Check orphans (Optional depending on table)
        // e.g. users -> department_id (if d5 is legacy)
        if (table === 'users') {
            // Check for hardcoded department legacy IDs
            const { count: d5Users } = await supabase
                .from('users')
                .select('id', { count: 'exact', head: true })
                .eq('department_id', 'd5');
            report[table].d5_users = d5Users;
        }
    }

    console.log('Audit Complete. Generating JSON...');
    fs.writeFileSync('all_tables_audit.json', JSON.stringify(report, null, 2));
    console.log('Report saved to all_tables_audit.json');
}

runAudit();
