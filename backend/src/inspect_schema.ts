
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'd:/Manifest System/backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const outputLog = 'd:/Manifest System/backend/schema_audit_log.txt';

const inspectSchema = async () => {
    const tableNames = [
        'ministry_events', 'members', 'souls', 'users',
        'pickup_stations', 'vehicles', 'healing_reports',
        'next_gen_souls', 'departments', 'requisitions',
        'transactions'
    ];

    console.log("Starting Schema Audit...");
    let logBuffer = "--- SCHEMA AUDIT ---\n";

    for (const table of tableNames) {
        // Query information_schema is not directly accessible via supabase-js public API unless exposed.
        // Instead, we can try to RPC or just select 1 row and infer, but that doesn't give us types.
        // Wait, Supabase client doesn't give direct access to information_schema without a function.
        // I will try to use the 'rpc' 'get_schema_info' if it exists, or just valid SQL actions.

        // Actually, for this task, reading one row is strictly "inferring".
        // A better way is to see if any migration files create these tables.

        // Let's try to query 'data' and look at the structure.

        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            logBuffer += `\nTABLE: ${table} - ERROR: ${error.message}\n`;
        } else {
            logBuffer += `\nTABLE: ${table}\n`;
            if (data && data.length > 0) {
                const row = data[0];
                for (const key of Object.keys(row)) {
                    const value = row[key];
                    const typeInfo = (value === null) ? 'null' : typeof value;
                    // Heuristic for UUID
                    const isUUID = (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
                    logBuffer += `  - ${key}: ${typeInfo} ${isUUID ? '(Likely UUID)' : ''} Value: ${value}\n`;
                }
            } else {
                logBuffer += `  (No data to infer types)\n`;
            }
        }
    }

    // Check specifically for Department IDs by querying distinct department_id from users or requisitions
    const { data: deptData } = await supabase.from('requisitions').select('department_id').limit(5);
    logBuffer += `\nCHECK: requisitions.department_id samples: ${JSON.stringify(deptData)}\n`;

    fs.writeFileSync(outputLog, logBuffer);
    console.log("Schema audit complete. Log written to " + outputLog);
};

inspectSchema();
