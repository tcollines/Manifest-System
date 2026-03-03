import { Request, Response } from 'express';
import { supabase, supabaseAnon } from '../supabase';

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Step 1: Lookup real email by username if it doesn't look like an email
        // We use the regular `supabase` (service role) to query `public.users` safely
        let targetEmail = username.trim();
        let emailFound = true;

        if (!targetEmail.includes('@')) {
            const { data, error } = await supabase
                .from('users')
                .select('email')
                .eq('username', targetEmail) // unique index enforced natively in DB
                .maybeSingle();

            if (error || !data || !data.email) {
                emailFound = false;
                console.log('[LOGIN DEBUG]', {
                    username,
                    emailFound,
                    supabaseError: error?.message || 'Username not found in public.users'
                });
                // Delay artificially to mitigate timing attacks identifying valid vs invalid usernames
                await new Promise(resolve => setTimeout(resolve, 1000));
                return res.status(401).json({ error: 'Invalid login credentials' });
            }
            targetEmail = data.email;
        }

        // Step 2: Authenticate securely with the real email
        // MUST use Anon Client, Service Role cannot generate sessions.
        const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
            email: targetEmail,
            password
        });

        if (authError || !authData || !authData.session) {
            console.log('[LOGIN DEBUG]', {
                username,
                emailFound,
                targetEmail,
                supabaseUrl: process.env.SUPABASE_URL,
                supabaseError: authError?.message || 'Empty session returned'
            });
            console.log('[SUPABASE AUTH ERROR]', authError);
            return res.status(401).json({ error: 'Invalid login credentials' });
        }

        console.log('[LOGIN SUCCESS]', { username, targetEmail });
        res.json({ session: authData.session });
    } catch (error: any) {
        console.error('[AUTH LOGIN ERROR]', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
