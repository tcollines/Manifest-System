
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials. URL:', !!supabaseUrl, 'KEY:', !!supabaseKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const log = [];
    const logFile = path.resolve(__dirname, 'audit_output.txt');

    function logMsg(msg) {
        console.log(msg);
        log.push(msg);
    }

    logMsg('--- START AUDIT ---');
    logMsg('Connecting to Supabase...');
    const tables = [
        'members', 'service_attendance', 'users', 'departments', 'ministry_events',
        'souls', 'pickup_stations', 'vehicles', 'passengers', 'personal_vehicles',
        'incident_reports', 'volunteer_attendance', 'transactions', 'next_gen_souls'
    ];

    for (const table of tables) {
        // Check 1000 rows max for speed
        const { data: rows, error } = await supabase.from(table).select('*').limit(1000);
        if (error) {
            logMsg(`[${table}] ERROR: ${error.message}`);
            continue;
        }

        if (!rows || rows.length === 0) {
            logMsg(`[${table}] EMPTY`);
            continue;
        }

        const keys = Object.keys(rows[0]);
        const colsToCheck = keys.filter(k => k === 'id' || k.endsWith('_id') || k.includes('legacy'));

        for (const col of colsToCheck) {
            let uuid = 0;
            let legacy = 0;
            let other = 0;
            let nulls = 0;
            const samples = [];

            for (const r of rows) {
                const val = r[col];
                if (val === null) {
                    nulls++;
                    continue;
                }
                const s = String(val);
                if (samples.length < 3) samples.push(s);

                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
                    uuid++;
                } else if (/^(evt-|d\d+|m-|p-|pv-)/.test(s)) {
                    legacy++;
                } else {
                    other++;
                }
            }

            if (legacy > 0 || other > 0) {
                logMsg(`[${table}.${col}] Total:${rows.length} UUID:${uuid} LEGACY:${legacy} OTHER:${other} NULL:${nulls}`);
                logMsg(`   Samples: ${samples.join(', ')}`);
            } else if (col === 'id') {
                logMsg(`[${table}.${col}] ALL UUID (Total: ${rows.length})`);
            }
        }
    }
    logMsg('--- END AUDIT ---');
    fs.writeFileSync(logFile, log.join('\n'));
}

run();
