
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { return; }

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGETS = {
    'personal_vehicles': ['id'],
    'passengers': ['id', 'vehicle_id', 'event_id', 'station_id'],
    'vehicles': ['id', 'event_id', 'station_id'],
    'pickup_stations': ['id', 'event_id'],
    'users': ['id', 'event_id', 'department_id'],
    'children': ['id', 'parent_id'],
    'ministry_events': ['id'],
    'members': ['id'],
    'service_attendance': ['member_id', 'service_id'],
    'souls': ['id', 'event_id']
};

async function auditTypes() {
    console.log('--- AUDITING COLUMN DATA TYPES ---');
    const results = {};

    for (const [table, cols] of Object.entries(TARGETS)) {
        results[table] = {};

        for (const col of cols) {
            process.stdout.write(`Checking ${table}.${col}... `);

            // Test: Query with invalid UUID
            const { error } = await supabase
                .from(table)
                .select(col)
                .eq(col, 'not-a-uuid-123')
                .limit(1);

            if (error && error.message.includes('invalid input syntax for type uuid')) {
                console.log('UUID (Native)');
                results[table][col] = 'UUID';
            } else if (!error) {
                console.log('TEXT (Loose)');
                results[table][col] = 'TEXT';
            } else {
                console.log(`ERROR: ${error.message}`);
                results[table][col] = `UNKNOWN (${error.message})`;
            }
        }
    }

    console.log('--- AUDIT COMPLETE ---');
    fs.writeFileSync('column_types_audit.json', JSON.stringify(results, null, 2));
}

auditTypes();
