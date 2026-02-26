
// @ts-nocheck
import { supabase } from '../src/supabase';
import fs from 'fs';
import path from 'path';

export const applyFix = async () => {
    const sqlPath = path.resolve(__dirname, '../database/52_fix_attendance_integrity.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error('SQL File not found:', sqlPath);
        return;
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Applying Fix...');

    // We can use exec_sql RPC if available
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Error applying fix:', error);
    } else {
        console.log('Fix Applied Successfully.');
    }
    process.exit(0);
};

applyFix();
