
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const logFile = path.resolve(__dirname, 'backend_access_log.txt');
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

// Reset log file
fs.writeFileSync(logFile, '--- Backend Access Log ---\n');

log('URL: ' + supabaseUrl);
try {
    if (supabaseKey) {
        const payload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64').toString());
        log('Key Role: ' + payload.role);
    } else {
        log('Key is missing!');
    }
} catch (e: any) {
    log('Failed to decode key: ' + e.message);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    log('\n--- Table Counts (Service Role) ---');
    const tables = ['ministry_events', 'members', 'service_attendance', 'souls', 'children'];

    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            log(`[${table}] Error: ${error.message}`);
        } else {
            log(`[${table}] Count: ${count}`);
        }
    }

    log('\n--- Sample Event Check ---');
    const { data: events, error: eError } = await supabase.from('ministry_events').select('*').limit(1);
    if (eError) log('Event Fetch Error: ' + eError.message);
    else log('Sample Event Keys: ' + (events && events.length > 0 ? Object.keys(events[0]).join(', ') : 'No events found'));

    log('\n--- Souls Constraint Check ---');
    const { data: constraints, error: cError } = await supabase
        .rpc('get_check_constraints', { table_name: 'souls' });
    // Wait, RPC might not exist. Let's try to just guess or select distinct status.

    const { data: distinctStatuses, error: dError } = await supabase
        .from('souls')
        .select('status')
        .limit(100);

    if (dError) log('Status Fetch Error: ' + dError.message);
    else {
        const statuses = [...new Set(distinctStatuses.map((s: any) => s.status))];
        log('Existing Statuses in DB: ' + statuses.join(', '));
    }
}

check();
