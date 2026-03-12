import { supabase } from './src/supabase';
import fs from 'fs';
import path from 'path';

async function run() {
    const sqlPath = path.join(__dirname, '../frontend/database/17_add_event_scoping.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log("Running migration via RPC inline_code_block...");
        const { data, error } = await supabase.rpc('inline_code_block', { sql_query: sql });

        if (error) {
            console.error("Migration Failed:", error.message);
            // If function doesn't exist, we'll know
        } else {
            console.log("Migration Successful:", data);
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

run();
