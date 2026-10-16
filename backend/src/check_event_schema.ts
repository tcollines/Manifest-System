import { resolve as resolveEnvPath } from 'path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: resolveEnvPath(__dirname, '../.env') });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const testZeroVsOne = async () => {
    console.log("--- TESTING SERVICE NUMBER 0 vs 1 ---");

    // Test 1: service_number = 0
    console.log("\n--- TEST: Insert with service_number: 0 ---");
    const testEvent0 = {
        title: "Debug Zero " + Date.now(),
        type: "Service",
        date: new Date().toISOString().split('T')[0],
        time: "10:00",
        location: "Debug Loc",
        description: "Debug Desc",
        service_number: 0,
        stats: { attendees: 0 }
    };

    const { data: d0, error: e0 } = await supabase.from('ministry_events').insert([testEvent0]).select();
    if (e0) {
        console.log("!!! ZERO FAILED !!!");
        console.log("Msg:", e0.message);
    } else {
        console.log("!!! ZERO SUCCEEDED !!!");
        console.log("ID:", d0[0].id);
    }

    // Test 2: service_number = 1
    console.log("\n--- TEST: Insert with service_number: 1 ---");
    const testEvent1 = {
        title: "Debug One " + Date.now(),
        type: "Service",
        date: new Date().toISOString().split('T')[0],
        time: "10:00",
        location: "Debug Loc",
        description: "Debug Desc",
        service_number: 1,
        stats: { attendees: 0 }
    };

    const { data: d1, error: e1 } = await supabase.from('ministry_events').insert([testEvent1]).select();
    if (e1) {
        console.log("!!! ONE FAILED !!!");
        console.log("Msg:", e1.message);
    } else {
        console.log("!!! ONE SUCCEEDED !!!");
        console.log("ID:", d1[0].id);
    }
};

testZeroVsOne();
