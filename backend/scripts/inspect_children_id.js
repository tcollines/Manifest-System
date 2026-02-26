
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { return; }

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectChildren() {
    console.log('--- INSPECTING CHILDREN TABLE ---');

    const { data, error } = await supabase
        .from('children')
        .select('*')
        .limit(3);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (data.length === 0) {
        console.log('No data found in children table.');
        return;
    }

    console.log('Sample Data (First 3 rows):');
    data.forEach(row => {
        console.log(`ID: ${row.id} (Type: ${typeof row.id})`);
        // Check if there's a legacy_id too
        if (row.legacy_id) console.log(`  Legacy ID: ${row.legacy_id}`);
    });
}

inspectChildren();
