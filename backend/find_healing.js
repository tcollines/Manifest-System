import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);

async function run() {
    // Attempt to query standard healing-related table names
    const tables = ['healing_reports', 'healing_school_reports', 'healing_outreach_reports', 'healing_activities'];
    for (const t of tables) {
        const { error } = await supabase.from(t).select('id').limit(1);
        if (!error) console.log('✅ Found table:', t);
    }
}
run();
