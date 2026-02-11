
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    // Try querying information_schema
    const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'souls');

    if (error) {
        console.error('Error:', error);
        // Fallback: Check one record's keys if possible, or try a direct SQL if allowed via RPC
        const { data: oneRecord } = await supabase.from('souls').select('*').limit(1);
        console.log('Sample Record Keys:', oneRecord ? Object.keys(oneRecord[0] || {}) : 'None');
    } else {
        console.table(columns);
    }
}

inspect();
