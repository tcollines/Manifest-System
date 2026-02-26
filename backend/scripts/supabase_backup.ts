
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
    'members',
    'ministry_events',
    'service_attendance',
    'pickup_stations',
    'vehicles',
    'passengers',
    'souls',
    'incidents',
    'volunteer_attendance'
];

async function runBackup() {
    console.log('--- Phase 3B: Manual Supabase Backup (Option B) ---');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.resolve(__dirname, `../manifest_pre_phase_3b_${timestamp}.json`);

    const backupData: Record<string, any[]> = {};
    let totalRows = 0;

    try {
        for (const table of TABLES) {
            console.log(`Backing up table: ${table}...`);
            let allRows: any[] = [];
            let { data, error, count } = await supabase
                .from(table)
                .select('*', { count: 'exact' });

            if (error) throw new Error(`Error fetching ${table}: ${error.message}`);

            allRows = data || [];

            // Handle pagination if more than 1000 rows
            if (count && count > 1000) {
                console.log(`  Pagination required for ${table} (${count} total rows)`);
                let from = 1000;
                while (from < count) {
                    const { data: nextPage, error: nextError } = await supabase
                        .from(table)
                        .select('*')
                        .range(from, from + 999);

                    if (nextError) throw new Error(`Pagination error for ${table}: ${nextError.message}`);
                    if (nextPage) allRows = allRows.concat(nextPage);
                    from += 1000;
                }
            }

            backupData[table] = allRows;
            console.log(`  ✅ ${allRows.length} rows secured.`);
            totalRows += allRows.length;
        }

        const payload = {
            metadata: {
                timestamp: new Date().toISOString(),
                label: 'manifest_pre_phase_3b',
                totalTables: TABLES.length,
                totalRows
            },
            data: backupData
        };

        fs.writeFileSync(backupFile, JSON.stringify(payload, null, 2));
        console.log(`\n🎉 Backup Completed Successfully!`);
        console.log(`File: ${path.basename(backupFile)}`);
        console.log(`Size: ${(fs.statSync(backupFile).size / (1024 * 1024)).toFixed(2)} MB`);
    } catch (err: any) {
        console.error(`\n❌ Backup Failed:`, err.message);
        process.exit(1);
    }
}

runBackup();
