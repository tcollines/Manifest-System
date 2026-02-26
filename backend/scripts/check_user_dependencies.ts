
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const TARGET_IDS = [
    "u-1766828589838",
    "u-1767098315400",
    "u-teamleader-001",
    "u-admin-001"
];

const TABLES_TO_CHECK = [
    { name: 'department_requests', col: 'user_id' },
    { name: 'logistics_assignments', col: 'user_id' },
    { name: 'vehicle_checkouts', col: 'coordinator_id' }
];

async function run() {
    console.log("--- CHECKING USER DEPENDENCIES ---");

    // Validate tables
    const validTables = [];
    for (const t of TABLES_TO_CHECK) {
        const { error } = await supabase.from(t.name).select(t.col).limit(1);
        if (!error) {
            validTables.push(t);
        } else {
            // console.warn(`Skipping ${t.name}: ${error.message}`);
        }
    }
    console.log(`Scanning verified tables: ${validTables.map(t => t.name).join(', ')}`);

    for (const id of TARGET_IDS) {
        let found = false;
        for (const t of validTables) {
            const { count } = await supabase
                .from(t.name)
                .select('*', { count: 'exact', head: true })
                .eq(t.col, id);

            if (count && count > 0) {
                console.log(`[ALERT] User ${id} found in ${t.name} (${count} rows)`);
                found = true;
            }
        }
        if (!found) {
            console.log(`User ${id} - No dependencies found.`);
        }
    }
}

run();
