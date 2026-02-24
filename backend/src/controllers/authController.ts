import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Step 1: Lookup real email by username if it doesn't look like an email
        let targetEmail = username.trim();

        if (!targetEmail.includes('@')) {
            const { data, error } = await supabase
                .from('users')
                .select('email')
                .eq('username', targetEmail) // unique index enforced natively in DB
                .maybeSingle();

            if (error || !data || !data.email) {
                // Delay artificially to mitigate timing attacks identifying valid vs invalid usernames
                await new Promise(resolve => setTimeout(resolve, 1000));
                return res.status(401).json({ error: 'Invalid login credentials' });
            }
            targetEmail = data.email;
        }

        // Step 2: Authenticate securely with the real email
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password
        });

        if (authError || !authData || !authData.session) {
            return res.status(401).json({ error: 'Invalid login credentials' });
        }

        res.json({ session: authData.session });
    } catch (error: any) {
        console.error('[AUTH LOGIN ERROR]', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
