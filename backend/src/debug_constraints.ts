import { resolve as resolveEnvPath } from 'path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: resolveEnvPath(__dirname, '../.env') });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const checkConstraints = async () => {
    console.log("Checking constraints for ministry_events...");

    // Check columns
    const { data, error } = await supabase
        .from('ministry_events')
        .select('*')
        .limit(0); // Just want structure or error

    if (error) {
        console.log("Error accessing table:", error.message);
    }

    // Try to get info schema via RPC if possible, or just raw insert again and catch error cleanly
    // Since previous logs were cut off, I will console log SHORT lines.

    const { error: insertError } = await supabase
        .from('ministry_events')
        .insert([{ title: "Constraint Test" }]) // Missing everything else
        .select();

    if (insertError) {
        console.log("INSERT ERROR DETAILS:");
        console.log("MSG:", insertError.message);
        console.log("DETAILS:", insertError.details);
        console.log("HINT:", insertError.hint);
    }
};

checkConstraints();
