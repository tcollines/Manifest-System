
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTriggers() {
    console.log('--- LISTING TRIGGERS ON personal_vehicles ---');

    // We can query pg_trigger join with pg_class
    const { data: triggers, error } = await supabase
        .from('pg_trigger' as any)
        .select(`
            tgname,
            tgtype,
            tgenabled,
            pg_class!inner (
                relname
            )
        `)
        .eq('pg_class.relname', 'personal_vehicles');

    if (error) {
        console.error("Error fetching triggers:", error.message);
        // Try a more direct SQL approach if possible via RPC
    } else {
        console.log("Triggers found:");
        console.table(triggers);
    }
}

listTriggers();
