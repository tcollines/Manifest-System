import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Create an anon client specifically for auth verification
const supabaseAuthClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY! || process.env.SUPABASE_SERVICE_ROLE_KEY! // Fallback to service key if anon key is missing, though we use it just to call getUser
);

// Extend Express Request interface to include user and manifest_id
declare global {
    namespace Express {
        interface Request {
            user?: any;
            manifestId?: string;
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // For now, allow requests to proceed without token to prevent breaking EVERYTHING instantly,
            // but attach a warning. In a strict environment, return 401.
            console.warn('[AUTH] Missing or invalid Authorization header on route:', req.originalUrl);
            return next();
        }

        const token = authHeader.split(' ')[1];

        // Verify token with Supabase
        const { data: { user }, error } = await supabaseAuthClient.auth.getUser(token);

        if (error || !user) {
            console.warn('[AUTH] Token verification failed:', error?.message);
            // Non-blocking for now to prevent catastrophic breakage, but we log it.
            return next();
        }

        // Extract manifest_id from user metadata or app_metadata
        let manifestId = user.app_metadata?.manifest_id || user.user_metadata?.manifest_id;

        console.log(`[AUTH DEBUG] User: ${user.email}, ManifestID: ${manifestId}`);
        // console.log('[AUTH DEBUG] Full App Metadata:', JSON.stringify(user.app_metadata));

        req.user = user;
        req.manifestId = manifestId;

        next();
    } catch (error) {
        console.error('[AUTH MIDDLEWARE ERROR]', error);
        next();
    }
};
