require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function investigateBen() {
    console.log("Investigating Ben Kutosi's ghost account...");
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('name', '%Ben Kutosi%');

    if (error) {
        console.error("Error fetching user:", error);
    } else {
        console.log("Found Users:", JSON.stringify(data, null, 2));
    }
}

investigateBen();
