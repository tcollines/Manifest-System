import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
    console.error("Missing Superadmin Keys");
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    const sql = fs.readFileSync('./database/78_event_auth_cleanup_rpc.sql', 'utf-8');

    console.log("Deploying `delete_expired_event_auth_users` RPC...");

    // Deploy via REST payload
    const res = await fetch(`${url}/rest/v1/`, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: sql })
    });

    console.log("Deployment HTTP Status:", res.status);

    // Execute immediately to clean up past test events
    const { error } = await supabase.rpc('delete_expired_event_auth_users');
    if (error) {
        console.error("Failed to execute cleanup", error);
    } else {
        console.log("Secure Auth Cleanup Executed!");
    }
}

run();
