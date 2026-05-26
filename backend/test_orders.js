const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log("Fetching sales_orders...");
    const { data, error } = await supabase.from('sales_orders').select('*').limit(5);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success! Fetched", data.length, "orders.");
    }
}
test();
