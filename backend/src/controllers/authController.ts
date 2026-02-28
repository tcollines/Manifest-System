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
        let inputIdentifier = username.trim();
        let targetEmail = inputIdentifier;

        // Search by either exact username OR exact email lookup case-insensitively
        // STRICT: We MUST exclude deleted users to prevent identity collisions
        const { data: usersData, error } = await supabase
            .from('users')
            .select('email, password')
            .or(`username.ilike.${inputIdentifier},email.ilike.${inputIdentifier}`)
            .neq('status', 'Deleted')
            .limit(1);

        const data = usersData?.[0];

        if (error || !data) {
            console.log('[LOGIN DEBUG]', {
                inputIdentifier,
                supabaseError: error?.message || 'Identifier not found in public.users'
            });
            // Delay artificially to mitigate timing attacks identifying valid vs invalid usernames
            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.status(401).json({ error: 'Invalid login credentials' });
        }

        // Use true email if it exists, otherwise reconstruct the synthetic .local identity
        // used to provision Coordinators and Data Entrants.
        targetEmail = data.email || `${inputIdentifier.toLowerCase().replace(/\s+/g, '')}@manifest.local`;

        // Step 2: Authenticate securely with the real email
        // MUST use Anon Client, Service Role cannot generate sessions.
        const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
            email: targetEmail,
            password
        });

        if (authError || !authData || !authData.session) {
            console.log('[LOGIN DEBUG]', {
                username,
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
