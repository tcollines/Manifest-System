import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);

async function run() {
    const { data, error } = await supabase.from('report_submissions').select('*').limit(2);
    if (error) console.error("Error:", error);
    else console.log("Data:", JSON.stringify(data, null, 2));
}
run();
