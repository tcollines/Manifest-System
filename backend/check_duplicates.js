const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDuplicates() {
    const email = 'abratumwe@gmail.com';
    console.log(`--- Checking for duplicates of ${email} ---`);

    // 1. Search by email
    const { data: byEmail, error: err1 } = await supabase
        .from('users')
        .select('id, email, name, manifest_id')
        .eq('email', email);

    if (err1) console.error("Error searching by email:", err1);
    else console.log(`Found ${byEmail.length} rows by email:`, byEmail);

    // 2. Search by ID if we can find one from the previous debug
    const knownId = '67b59a2d-b106-4fc6-8151-61c88680c144'; // From earlier debug output
    console.log(`--- Checking for duplicates of ID ${knownId} ---`);
    const { data: byId, error: err2 } = await supabase
        .from('users')
        .select('id, email, name, manifest_id')
        .eq('id', knownId);

    if (err2) console.error("Error searching by ID:", err2);
    else console.log(`Found ${byId.length} rows by ID:`, byId);
}

checkDuplicates();
