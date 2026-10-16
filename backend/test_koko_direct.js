require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

async function testKokoAuth() {
    console.log("Testing GoTrue Auth for Koko...");
    // Injecting explicit environment keys since ANON_KEY is not in backend .env
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_KEY;

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
