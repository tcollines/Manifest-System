import { supabase } from '../supabase';

async function run() {
    console.log("=== INSPECTING USER BY ID b75a1d39-20a9-40fb-aa95-a31e02fa54e5 ===");
    
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', 'b75a1d39-20a9-40fb-aa95-a31e02fa54e5')
        .maybeSingle();

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (user) {
        console.log(`User Row:`);
        console.log(JSON.stringify(user, null, 2));
    } else {
        console.log("User not found by ID.");
    }
}

run().catch(console.error);
