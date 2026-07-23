import { supabase } from '../supabase';

async function listRPCs() {
    console.log("Querying database functions via Supabase client...");
    const { data, error } = await supabase
        .from('pg_proc')
        .select('proname')
        .limit(20);

    if (error) {
        console.log("Could not query pg_proc directly:", error.message);
    } else {
        console.log("Found pg_proc records:", data);
    }
}

listRPCs();
