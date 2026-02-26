
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn(table: string, column: string) {
    const { data, error } = await supabase.from(table).select(column);
    if (error) {
        console.error(`Error reading ${table}.${column}:`, error.message);
        return false;
    }

    const invalid = data.filter((row: any) => {
        const val = row[column];
        // Strict UUID regex
        return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    });

    if (invalid.length > 0) {
        console.error(`FAILURE: ${table}.${column} has ${invalid.length} invalid rows.`);
        console.error('Sample:', invalid.slice(0, 3));
        return false;
    }

    console.log(`SUCCESS: ${table}.${column} is 100% UUID valid (${data.length} rows).`);
    return true;
}


async function runChecks() {
    console.log('--- Pre-Migration Data Validation ---');
    let success = true;

    if (!(await checkColumn('members', 'id'))) success = false;
    if (!(await checkColumn('ministry_events', 'id'))) success = false;
    if (!(await checkColumn('pickup_stations', 'id'))) success = false;
    if (!(await checkColumn('pickup_stations', 'event_id'))) success = false;

    if (!success) {
        console.error('\n🛑 Pre-checks FAILED. Aborting migration.');
        process.exit(1);
    } else {
        console.log('\n✅ All pre-checks PASSED. Safe to proceed with schema conversion.');
        process.exit(0);
    }
}

runChecks();
