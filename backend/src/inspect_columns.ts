import { resolve as resolveEnvPath } from 'path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: resolveEnvPath(__dirname, '../.env') });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const inspect = async () => {
    console.log("--- INSPECTING ministry_events ---");

    // 1. Try to fetch one row
    const { data, error } = await supabase
        .from('ministry_events')
        .select('*')
        .limit(1);

    if (data && data.length > 0) {
        console.log("Existing Columns:", Object.keys(data[0]));
    } else {
        console.log("No data found.");
    }
};

inspect();
