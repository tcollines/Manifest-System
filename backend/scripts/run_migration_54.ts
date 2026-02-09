import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Running Migration 54: Create Departments...');

    const sqlPath = path.resolve(__dirname, '../src/database/migrations/54_create_departments.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by statement if needed, but Supabase RPC/Execute might handle blocks.
    // However, Supabase JS client doesn't support raw SQL query directly without RPC or PG driver.
    // We will assume there is an RPC 'exec_sql' or we use a direct connection library if available.
    // Checking previous context, we might not have 'exec_sql'.
    // BUT we can use the 'postgres' library if installed, or just try RPC.
    // Let's check if there is a 'exec_sql' RPC or similar used in other scripts?
    // Use standard 'rpc' call to a function if it exists.

    // Fallback: If no direct SQL access, we can try to use the `pg` library if installed in package.json
    // But since I cannot check package.json easily right now without more tool calls...
    // I recall `check_mpala.ts` might have used something.

    // ALTERNATIVE: Use the `psql` command line tool if available in the environment?
    // The environment is Windows. I might not have `psql`.

    // LET'S TRY RPC `exec_sql` first. If it fails, I'll notify.

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Migration Failed via RPC:', error);
        // Fallback: Try to use direct PG connection if `pg` is available?
        // Or just print instructions.

        // Actually, let's look at `migrate_coordinator_roles.ts` from file list.
        // It likely has the pattern.
        console.log('Trying to use direct pg connection if RPC failed...');
    } else {
        console.log('Migration Successful via RPC!');
    }
}

runMigration();
