
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectUsers() {
    console.log('--- INSPECTING USERS TABLE ---');

    // Check one user to see data format
    const { data: users, error } = await supabase.from('users').select('*').limit(3);

    if (error) {
        console.error('Error:', error);
        return;
    }

    users.forEach(u => {
        console.log(`User: ${u.name}`);
        console.log(`  Role: ${u.role}`);
        console.log(`  Dept ID (db): ${u.department_id}`);
        console.log(`  Dept UID (db): ${u.department_uid}`); // Check if this exists
    });
}

inspectUsers();
