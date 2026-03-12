import { Request, Response } from 'express';
import { supabase, supabaseAnon } from '../supabase';

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        let inputIdentifier = username.trim();
        let targetEmail = inputIdentifier;

        // Search by either exact username OR exact email lookup
        // Priority 1: Exact Case-Sensitive Match
        let { data: usersData, error } = await supabase
            .from('users')
            .select('id, email, password, role')
            .or(`username.eq."${inputIdentifier}",email.eq."${inputIdentifier}"`)
            .neq('status', 'Deleted')
            .limit(1);

        // Priority 2: Fallback to case-insensitive match (only if no exact match found)
        if (!usersData || usersData.length === 0) {
            const fallbackResult = await supabase
                .from('users')
                .select('id, email, password, role') // MATCH THE COLUMNS REQUESTED ABOVE
                .or(`username.ilike."${inputIdentifier}",email.ilike."${inputIdentifier}"`)
                .neq('status', 'Deleted')
                .limit(1);
            usersData = fallbackResult.data;
            error = fallbackResult.error;
        }

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

        // --- NEW: SYNTHETIC EMAIL FALLBACK ---
        // For roles that don't traditionally have emails, public.users.email might be out of sync
        // with the true identity provisioned in auth.users.
        // To guarantee success, we fetch the exact email registered in GoTrue for this user ID.
        let verifiedAuthEmail = data.email;

        if (['Logistics', 'Stage Coordinator', 'Vehicle Coordinator', 'Coordinator', 'Resident Coordinator'].includes(data.role)) {
            try {
                const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(data.id);
                if (authUser?.user?.email) {
                    verifiedAuthEmail = authUser.user.email;
                    console.log(`[LOGIN SYNC] Resolved GoTrue email ${verifiedAuthEmail} for ${inputIdentifier}`);
                }
            } catch (e: any) {
                console.warn(`[LOGIN SYNC WARNING] Failed to fetch GoTrue identity for ${data.id}:`, e.message);
            }
        }

        // Use verified email if found, otherwise reconstruct the synthetic .local identity fallback
        targetEmail = verifiedAuthEmail || `${inputIdentifier.toLowerCase().replace(/\s+/g, '')}@manifest.local`;

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
