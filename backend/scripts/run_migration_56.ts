import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runMigration() {
    console.log('Running Migration 56: Migrate Member IDs...');

    const sqlPath = path.resolve(__dirname, '../src/database/migrations/56_migrate_member_ids.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split slightly if needing step-by-step, but `exec_sql` handles blocks well usually if not too complex.
    // Ideally, we run the ALTER TABLE first, then the DO block.

    try {
        // 1. Add Column
        console.log('Adding legacy_id column...');
        const step1 = `
      ALTER TABLE members ADD COLUMN IF NOT EXISTS legacy_id TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_members_legacy_id ON members(legacy_id) WHERE legacy_id IS NOT NULL;
      `;
        const { error: err1 } = await supabase.rpc('exec_sql', { sql_query: step1 });
        if (err1) throw err1;

        // 2. Execute Migration Logic
        console.log('Executing ID Migration Logic (This may take a moment)...');

        // We need to read the file again but extract the DO block or just run the file content if the first part is idempotent (it is).
        // actually, let's just run the DO block part from the file to be safe? 
        // Simplified: Just use the SQL string I wrote, but maybe split it to ensure the column exists before the PL/pgSQL block runs?
        // Supabase `exec_sql` might run in one transaction. 
        // Let's run the whole file.

        const { error: err2 } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (err2) {
            console.error('Migration Logic Failed:', err2);
            throw err2;
        }

        console.log('Migration 56 Complete.');

    } catch (e) {
        console.error('Migration Failed:', e);
        process.exit(1);
    }
}

runMigration();
