import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://poazorjmzswectxvakzl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYXpvcmptenN3ZWN0eHZha3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTEyNjgsImV4cCI6MjA4MjM4NzI2OH0.63UUyttqrMAvPYeiA2IIqPxTnk_WftlMLTKQ99Ejv-A';

// Configure client with explicit fetch options to prevent silent network hangs
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    }
});
