
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'd:/Manifest System/backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const checkIdDefault = async () => {
    console.log("--- CHECKING ID DEFAULT ---");

    // We can't easily query information_schema via supabase-js without an RPC usually, 
    // unless we have specific permissions. 
    // But we can try a raw insert WITHOUT id and see the exact error again to be sure.

    const testEvent = {
        title: "ID Check " + Date.now(),
        type: "Service",
        date: new Date().toISOString().split('T')[0],
        time: "10:00",
        location: "Debug Loc",
        description: "Debug Desc",
        service_number: 1,
        stats: { attendees: 0 }
    };

    const { error } = await supabase.from('ministry_events').insert([testEvent]);

    if (error) {
        console.log("Insert without ID failed:", error.message);
        console.log("Details:", error.details);
    } else {
        console.log("Insert without ID succeeded!");
    }
};

checkIdDefault();
