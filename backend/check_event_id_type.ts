
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkIdType() {
    console.log("Checking ministry_events ID type...");

    // We can't strictly check column type via JS easily without RPC, 
    // but we can infer from the error message that it is TEXT.
    // Let's just try to confirm by selecting one.

    const { data, error } = await supabase.from('ministry_events').select('id').limit(1).single();

    if (data) {
        console.log(`Sample ID: ${data.id}`);
        console.log(`Type in JS: ${typeof data.id}`);
        // If it looks like a uuid strings, it is still a string in JS.
    }
}

checkIdType();
