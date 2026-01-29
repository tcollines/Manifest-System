
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- Checking Schema for table: children ---');
    const { data: columns, error } = await supabase
        .rpc('get_table_columns', { table_name: 'children' }); // Try RPC if function exists, else raw query?

    // Fallback to direct query if RPC doesn't exist (Supabase prevents direct info_schema access via connection sometimes, but let's try)
    // Actually, we can use PostgREST introspection if available, but usually easier to just try to select the column.

    // Method 2: Insert a dummy record with the column and see if it fails.
    // Method 3: Simply select the column from one row.

    const { data, error: selectError } = await supabase
        .from('children')
        .select('id, category')
        .limit(1);

    if (selectError) {
        console.error('❌ Error selecting "category" column:', selectError.message);
        console.log('   This confirms the column likely DOES NOT exist or is inaccessible.');
    } else {
        console.log('✅ Success! "category" column exists.');
        console.log('   Sample Data:', JSON.stringify(data, null, 2));
    }
}

checkSchema();
