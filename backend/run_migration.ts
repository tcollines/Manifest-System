import { supabase } from './src/config/supabaseClient';
import fs from 'fs';
import path from 'path';

async function run() {
    try {
        const sqlPath = path.join(__dirname, '../02_optimistic_locking.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log("Running migration...");
        const { data, error } = await supabase.rpc('inline_code_block', { sql_query: sql });
        if (error) {
            console.error("Migration Failed:", error);
        } else {
            console.log("Migration Successful:", data);
        }
    } catch (err) {
        console.error("Runner Error:", err);
    }
}

run();
