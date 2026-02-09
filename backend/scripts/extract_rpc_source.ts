import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function getRPCSource() {
    const { data, error } = await supabase.rpc('debug_sql', { sql_query: "SELECT prosrc FROM pg_proc WHERE proname = 'submit_member_entry'" });
    if (data) {
        console.log('RPC Source Found.');
        const fs = require('fs');
        fs.writeFileSync('d:/Manifest System/backend/scripts/rpc_source.txt', data[0].prosrc);
    } else {
        console.log('RPC Source NOT found or error:', error);
    }
}

getRPCSource();
