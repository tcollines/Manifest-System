import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRls() {
    // 1. Fetch the RLS policies from pg_policies
    const { data: policies, error } = await supabase
        .rpc('exec_sql', {
            sql: `SELECT tablename, policyname, cmd, qual, with_check 
                  FROM pg_policies 
                  WHERE schemaname = 'public' 
                  AND tablename IN ('pickup_stations', 'vehicles', 'passengers')
                  ORDER BY tablename, cmd;`
        });

    if (error) {
        console.log("RPC not available, trying information_schema:", error.message);

        // Try pg_stat_user_tables to check RLS status
        const { data: tables, error: err2 } = await supabase
            .from('pickup_stations')
            .select('id, event_id, manifest_id')
            .limit(3);

        console.log("pickup_stations sample (service role):", JSON.stringify(tables, null, 2));
        console.log("Error:", err2);
        return;
    }

    console.log("RLS Policies:", JSON.stringify(policies, null, 2));
}

checkRls().catch(console.error);
