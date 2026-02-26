
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debug() {
    console.log("--- USERS ---");
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*');

    if (userError) console.error(userError);
    else console.log(JSON.stringify(users, null, 2));

    console.log("\n--- DEPARTMENTS ---");
    const { data: depts, error: deptError } = await supabase
        .from('departments')
        .select('*');

    const fs = require('fs');
    const output = {
        users: users,
        departments: depts
    };
    fs.writeFileSync('debug_dept_output.json', JSON.stringify(output, null, 2));
    console.log("Output written to debug_dept_output.json");
}

debug();
