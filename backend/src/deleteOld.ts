require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);

async function run() {
    console.log("Deleting old redundant vehicle...");
    const { error } = await supabase.from('vehicles').delete().eq('id', '04bef2fe-a830-48fb-9db5-636ff28b8672');
    if (error) {
        console.error("Failed to delete", error);
    } else {
        console.log("Successfully deleted old vehicle. Only the new Reg Verify cloned vehicle remains!");
    }
}
run();
