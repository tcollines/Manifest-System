const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();
const supabaseUrl = process.env.SUPABASE_URL || 'https://poazorjmzswectxvakzl.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking DB constraints");

    // Check if there are duplicate emails in users
    const { data: users, error: err } = await supabase.from('users').select('id, email, name, role');
    if (err) {
        console.error("Error reading users", err);
        return;
    }
    const emails = users.map(u => u.email).filter(Boolean);
    const duplicates = emails.filter((e, i, a) => a.indexOf(e) !== i);
    console.log("Duplicate emails in users table:", [...new Set(duplicates)]);

    // Check auth.users via a dummy query if possible
    console.log("Total users in table:", users.length);
}
check();
