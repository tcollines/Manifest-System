
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRPC() {
    const serviceId = '52a9bb33-abce-4fdb-8c72-a02b30babf93'; // P569
    console.log(`--- VERIFYING RPC FOR ${serviceId} ---`);

    // Try calling the RPC
    const { data, error } = await supabase.rpc('get_event_highlights', { event_uuid: serviceId });
    if (error) {
        console.error("RPC Failed:", error.message);
        console.log("STATUS: RPC FIX NOT APPLIED YET");
    } else {
        console.log("RPC Success! Data:", data);
        console.log("STATUS: RPC FIX APPLIED");
    }
}

verifyRPC();
