
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL || 'https://jhykmbmctfbshwsjofhg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'Coordinator')
        .limit(5);

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    console.log("Found Coordinators:", users);
}

check();
