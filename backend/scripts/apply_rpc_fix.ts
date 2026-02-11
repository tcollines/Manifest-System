
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
    const sqlPath = path.resolve(__dirname, '../database/59_phase_3c_rpc_optimization.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying RPC Fix via exec_sql...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });

    if (error) {
        console.error('❌ Error applying RPC fix:', error);
    } else {
        console.log('✅ RPC fix applied successfully.');
    }
}

applyFix();
