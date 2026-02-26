
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { return; }

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- INSPECTING MEMBER CATEGORIES ---');

    // Check distinct categories
    const { data: categories, error } = await supabase
        .from('members')
        .select('category');

    if (error) {
        console.error(error);
        return;
    }

    const unique = [...new Set(categories.map(c => c.category))];
    console.log('Unique Categories:', unique);

    // Check if there's any 'age_group' or 'department' that might indicate Next Gen
    const { data: sample } = await supabase.from('members').select('*').limit(1);
    console.log('Sample Member Fields:', Object.keys(sample[0]));
}

inspect();
