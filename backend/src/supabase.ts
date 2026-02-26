import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// Backend should use Service Role Key to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // STRICT: No fallback to Anon key
const supabaseAnonKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
    console.error("CRITICAL ERROR: Missing SUPABASE_SERVICE_ROLE_KEY, SUPABASE_KEY, or SUPABASE_URL.");
    console.error("The backend requires the SERVICE_ROLE_KEY to function with admin privileges.");
    process.exit(1);
}

// Service Role Client (Bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Anon Client (Strictly for generating frontend-compatible Auth sessions, like Login/Signup)
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
