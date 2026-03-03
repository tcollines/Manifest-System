const { createClient } = require('@supabase/supabase-js');

async function testKokoAuth() {
    console.log("Testing GoTrue Auth for Koko...");
    // Injecting explicit environment keys since ANON_KEY is not in backend .env
    const url = 'https://poazorjmzswectxvakzl.supabase.co';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYXpvcmptenN3ZWN0eHZha3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2OTUwMDYsImV4cCI6MjA1MjI3MTAwNn0.8mN2n1V1p-hWb8oM_9I7Bnk_WftlMLTKQ99Ejv-A';

    const supabaseAnon = createClient(url, anonKey);

    try {
        const { data, error } = await supabaseAnon.auth.signInWithPassword({
            email: 'Kweenkoko3@gmail.com',
            password: 'Isaiah40:31'
        });

        if (error) {
            console.error("Auth Error:", error.message);
        } else {
            console.log("Auth Success! Access Token:", !!data.session?.access_token);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

testKokoAuth();
