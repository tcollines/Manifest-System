require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log("Fetching passenger schema sample...");
    const { data: pData, error: pError } = await supabase.from('passengers').select('*').limit(1);
    console.log("Passenger data:", pData, "Error:", pError);

    console.log("Fetching members schema sample...");
    const { data: mData, error: mError } = await supabase.from('members').select('*').limit(1);
    console.log("Members data:", mData, "Error:", mError);
}
test();
