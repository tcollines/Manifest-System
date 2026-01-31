
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'd:/Manifest System/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const checkSchema = async () => {
    console.log("--- CHECKING SCHEMA TYPES ---");

    // Check members.id type
    const { data: members, error } = await supabase
        .from('members')
        .select('id')
        .limit(1);

    if (error) {
        console.error("Error fetching members:", error);
    } else if (members && members.length > 0) {
        const idVal = members[0].id;
        console.log(`Sample Member ID: '${idVal}' (Type: ${typeof idVal})`);

        // Use RPC to check pg_typeof if possible, or just deduce
        // If it was UUID type, JS client receives string anyway.
        // But we can try to query information_schema
    }

    // Try a raw query using a dummy RPC if possible, or just trust the introspection
    // Since we don't have a direct SQL runner, we'll assume the error 'text = uuid' is the proof.
    // But let's try to fix it based on the strong hypothesis.
};

checkSchema();
