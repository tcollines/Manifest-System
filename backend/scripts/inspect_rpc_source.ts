
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRpc() {
    console.log('--- INSPECTING submit_member_entry SOURCE ---');

    // Query pg_proc to get the function definition
    const { data, error } = await supabase
        .rpc('exec_sql', {
            sql_query: "SELECT prosrc FROM pg_proc WHERE proname = 'submit_member_entry'"
        });

    // Since we fixed the exec_sql or not? We might not have exec_sql working if the rpc fix was just for parking highlights.
    // Actually, I can use the same technique as the previous "verify rpc" or just try to use the PG client which we know works now (if I look at how I applied the fix).

    // Wait, I applied the connection fix. I should use the PG client directly for this inspection to be safe.
}

// Re-write using PG Client
import { Client } from 'pg';

async function inspectRpcPg() {
    console.log('--- INSPECTING submit_member_entry SOURCE (PG) ---');
    const connectionString = process.env.DATABASE_URL;

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query("SELECT prosrc FROM pg_proc WHERE proname = 'submit_member_entry'");
        if (res.rows.length > 0) {
            const source = res.rows[0].prosrc;
            console.log("Source Code Length:", source.length);
            if (source.includes('v_first_timer_service_id := _current_service_id')) {
                console.log("✅ LOGIC FOUND: v_first_timer_service_id assignment exists.");
            } else {
                console.log("❌ LOGIC MISSING: v_first_timer_service_id assignment NOT found.");
            }
            // Check for INSERT column
            if (source.includes('first_timer_service_id')) {
                console.log("✅ COLUMN FOUND: first_timer_service_id in body.");
            } else {
                console.log("❌ COLUMN MISSING: first_timer_service_id not found in body.");
            }

        } else {
            console.log("Function not found.");
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}

inspectRpcPg();
