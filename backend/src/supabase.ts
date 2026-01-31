import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// Backend should use Service Role Key to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // STRICT: No fallback to Anon key

if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL ERROR: Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL.");
    console.error("The backend requires the SERVICE_ROLE_KEY to function with admin privileges.");
    process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
