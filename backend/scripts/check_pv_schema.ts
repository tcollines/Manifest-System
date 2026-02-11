
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.rpc('check_columns_type', { table_name: 'personal_vehicles' });
    if (error) {
        // Fallback to a simple select if RPC doesn't exist
        console.log("RPC check_columns_type not found, trying direct query...");
        const { data: cols, error: colError } = await supabase.from('personal_vehicles').select('*').limit(1);
        if (colError) {
            console.error(colError);
        } else {
            console.log("Sample record from personal_vehicles:", cols);
        }
    } else {
        console.log("Column Types for personal_vehicles:", data);
    }
}

checkSchema();
