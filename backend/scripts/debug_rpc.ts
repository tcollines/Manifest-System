
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('--- Debugging RPC get_event_highlights ---');
    const id = '38975f9c-5f10-4a62-8917-3ecd94896a76'; // S378

    const { data, error } = await supabase.rpc('get_event_highlights', { event_uuid: id });

    if (error) {
        console.error('RPC ERROR:', error);
    } else {
        console.log('RPC DATA:', JSON.stringify(data, null, 2));
    }
}

debug();
