const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
    'manifest_details',
    'users',
    'members',
    'children',
    'ministry_events',
    'pickup_stations',
    'vehicles',
    'passengers',
    'souls',
    'service_attendance',
    'volunteer_attendance',
    'incidents',
    'personal_vehicles',
    'department_requests',
    'report_submissions',
    'requisitions',
    'assets',
    'transactions',
    'monitoring_reports',
    'healing_reports',
    'school_outreach_reports',
    'next_gen_souls'
];

async function runBackup() {
    const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
    const backupDir = path.join(__dirname, `../backups/backup_${timestamp}`);

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(`Starting Database Backup to ${backupDir}\n`);

    for (const table of tables) {
        process.stdout.write(`Backing up ${table}... `);
        let allData = [];
        let offset = 0;
        const limit = 1000;
        let fetchMore = true;

        while (fetchMore) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .range(offset, offset + limit - 1);

            if (error) {
                if (error.code === '42P01') {
                    console.log('Skipped (Table does not exist)');
                    fetchMore = false;
                    break;
                }
                console.error(`\nError fetching ${table}:`, error.message);
                fetchMore = false;
                break;
            }

            if (data && data.length > 0) {
                allData = allData.concat(data);
                offset += limit;
                if (data.length < limit) {
                    fetchMore = false;
                }
            } else {
                fetchMore = false;
            }
        }

        if (allData.length > 0 || !fetchMore) {
            fs.writeFileSync(path.join(backupDir, `${table}.json`), JSON.stringify(allData, null, 2));
            console.log(`Done (${allData.length} rows)`);
        }
    }

    console.log('\n✅ Backup complete!');
}

runBackup();
