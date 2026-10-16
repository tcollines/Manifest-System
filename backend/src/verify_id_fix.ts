import { resolve as resolveEnvPath } from 'path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID as uuidv4 } from 'crypto';

dotenv.config({ path: resolveEnvPath(__dirname, '../.env') });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const verifyFix = async () => {
    console.log("--- VERIFYING EVENT CREATION FIX ---");

    // Mimic the backend logic locally first to be sure
    const payload = {
        title: "Final Fix Test " + Date.now(),
        type: "Service",
        date: new Date().toISOString().split('T')[0],
        time: "10:00",
        location: "Debug Loc",
        description: "Debug Desc",
        service_number: 1, // We know this works
        stats: { attendees: 0 }
    };

    // GENERATE UUID
    const id = uuidv4();
    const finalPayload = { ...payload, id };
    console.log("Generated ID:", id);

    const { data, error } = await supabase
        .from('ministry_events')
        .insert([finalPayload])
        .select()
        .single();

    if (error) {
        console.log("FAILED:", error.message);
    } else {
        console.log("SUCCEEDED:", data.id);
    }
};

verifyFix();
