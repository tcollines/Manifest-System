
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTable() {
    console.log('--- VERIFYING vehicle_attendance TABLE ---');

    // 1. Check if table exists by trying a count
    const { count, error } = await supabase
        .from('vehicle_attendance')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error fetching from vehicle_attendance:", error.message);
    } else {
        console.log(`Table exists. Count: ${count}`);

        // 2. Check sample row structure
        const { data: sample } = await supabase
            .from('vehicle_attendance')
            .select('*')
            .limit(1);

        if (sample && sample.length > 0) {
            console.log("Sample Row Keys:", Object.keys(sample[0]));
        } else {
            console.log("Table is empty.");
        }
    }

    // 3. Specifically check if there is an RPC for stats
    const { data: rpcTest, error: rpcError } = await supabase.rpc('get_service_highlights', { service_id: '52a9bb33-abce-4fdb-8c72-a02b30babf93' });
    if (rpcError) {
        console.log("get_service_highlights RPC failed or not found.");
    } else {
        console.log("RPC Response for stats:");
        console.log(rpcTest);
    }
}

verifyTable();
