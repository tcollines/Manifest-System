import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://poazorjmzswectxvakzl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYXpvcmptenN3ZWN0eHZha3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTEyNjgsImV4cCI6MjA4MjM4NzI2OH0.63UUyttqrMAvPYeiA2IIqPxTnk_WftlMLTKQ99Ejv-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testAuth() {
    console.log('Testing Supabase Auth...');
    const email = 'loymawanda1@manifest.local';

    try {
        const { data: user, error: dbError } = await supabase.from('users').select('id, password').eq('username', 'loymawanda1').single();
        if (dbError) {
            console.log('User not found in public.users:', dbError);
            return;
        }

        console.log(`Found DB user: ${user.id}. Password: ${user.password}`);

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 10000));
        const authPromise = supabase.auth.signInWithPassword({
            email,
            password: user.password
        });

        console.log('Awaiting auth...');
        const result: any = await Promise.race([authPromise, timeout]);
        console.log('Auth result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Exception during auth test:', err);
    }
}

testAuth();
