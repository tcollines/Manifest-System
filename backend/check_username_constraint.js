const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkConstraint() {
    const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'users' });
    if (error) {
        // Fallback to raw query if RPC fails
        const { data: rawData, error: rawError } = await supabase.from('users').select('username').limit(2);
        console.log("Raw Data Check:", rawData);
        // Try to insert a duplicate to see if it fails
        if (rawData && rawData.length > 0) {
            const firstUser = rawData[0];
            const { error: insertError } = await supabase.from('users').insert({
                id: crypto.randomUUID(),
                name: 'Duplicate Test',
                username: firstUser.username,
                password: 'test_password'
            });
            console.log("Duplicate Insert Error:", insertError);
        }
    } else {
        console.log("Constraints:", data);
    }
}

checkConstraint();
