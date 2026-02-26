const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFinalRow() {
    const email = 'abratumwe@gmail.com';
    const { data, error } = await supabase.from('users').select('*').eq('email', email);

    if (error) {
        console.error("Query Error:", error);
        return;
    }

    console.log(`Found ${data.length} rows for ${email}:`);
    data.forEach((u, i) => {
        console.log(`Row ${i + 1}:`);
        console.log(`  ID:   ${u.id}`);
        console.log(`  Name: ${u.name}`);
        console.log(`  MD:   ${u.manifest_id}`);
    });
}

checkFinalRow();
