
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing Supabase API connection...');
    const { data, error } = await supabase.from('members').select('id').limit(5);
    if (error) {
        console.error('❌ API FAILURE:', error.message);
    } else {
        console.log('✅ API SUCCESS! Found members:', data.length);
    }
}

test();
