
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function runMigration() {
    console.log("Running Migration: 51_fix_souls_schema.sql");
    const sqlPath = path.resolve(__dirname, 'database', '51_fix_souls_schema.sql');

    if (!fs.existsSync(sqlPath)) {
        console.error("SQL file not found:", sqlPath);
        return;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Attempt to run via RPC 'exec_sql' or 'exec' if it exists
    // Common pattern in these systems.
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });

    if (error) {
        console.error("RPC exec_sql failed:", error.message);
        console.log("Attempting creating function first? Or manual instruction.");
        // Try fallback or just notify user.
        // Actually, many Supabase instances don't have this enabled by default.
        // I'll try to use the 'postgres' access if I can? No.

        // Alternative: The user has `psql`?
        // I will output the SQL and tell the user to run it if I fail.
    } else {
        console.log("Migration executed successfully via RPC.");
    }
}

runMigration();
