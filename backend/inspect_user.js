const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectUser() {
    const email = 'abratumwe@gmail.com';
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error("Query Error:", error);
        return;
    }

    console.log("Found rows:", JSON.stringify(data, null, 2));

    if (data.length > 0) {
        const user = data[0];
        console.log(`Testing query by ID: ${user.id}`);
        const { data: byId, error: idErr } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id);

        if (idErr) console.error("ID Query Error:", idErr);
        else console.log(`Found ${byId.length} rows by ID ${user.id}`);
    }
}

inspectUser();
