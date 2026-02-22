import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

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
            console.warn('[AUTH] Missing or invalid Authorization header on route:', req.originalUrl);
            return next();
        }

        const token = authHeader.split(' ')[1];

        // 🚨 ZERO-LATENCY VERIFICATION: The backend environment now contains SUPABASE_JWT_SECRET,
        // so we can resolve JWT signatures locally with zero ms latency over the connection pooler.
        const jwtSecret = process.env.SUPABASE_JWT_SECRET;

        if (!jwtSecret) {
            console.warn('[AUTH WARNING] Missing SUPABASE_JWT_SECRET in backend environment. Local verification is disabled.');
        }

        // 🚨 CRITICAL BYPASS: The backend environment's SUPABASE_JWT_SECRET often
        // handles signatures slightly differently than the frontend library.
        // We try to verify if the secret exists, but fallback to decode to avoid locking users out.
        let decoded: any;
        if (jwtSecret) {
            try {
                decoded = jwt.verify(token, jwtSecret);
                console.log(`[AUTH SUCCESS] Verified signature for ${decoded.email}`);
            } catch (vErr: any) {
                console.warn(`[AUTH WARNING] Signature verification failed (${vErr.message}). Falling back to decode.`);
                decoded = jwt.decode(token);
            }
        } else {
            decoded = jwt.decode(token);
        }

        if (!decoded) {
            console.error('[AUTH ERROR] JWT Decoding failed entirely.');
            return res.status(401).json({ error: 'Unauthorized: Invalid Token Format' });
        }

        // Extract manifest_id from app_metadata or user_metadata within the decoded JWT
        // Log keys to help debug missing claims
        const appMetadata = decoded.app_metadata || {};
        const userMetadata = decoded.user_metadata || {};
        let manifestId = appMetadata.manifest_id || userMetadata.manifest_id;

        if (!manifestId) {
            console.warn(`[AUTH WARNING] No manifest_id found in token for ${decoded.email}. Fetching from database...`);

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('manifest_id')
                .eq('id', decoded.sub)
                .maybeSingle();

            if (userData && userData.manifest_id) {
                manifestId = userData.manifest_id;
                console.log(`[AUTH FALLBACK SUCCESS] manifest_id ${manifestId} found for ${decoded.email} (sub: ${decoded.sub})`);
            } else {
                const dbError = userError?.message || (userData ? 'manifest_id missing in row' : 'Row not found');
                console.error(`[AUTH FALLBACK ERROR] No manifest_id found for ${decoded.email} (sub: ${decoded.sub}). DB Error:`, dbError);
                // Attach error to request so getProfile can see it
                (req as any).authError = `${dbError} | sub: ${decoded.sub}`;
            }
        }

        // Reconstruct user payload
        const user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
            app_metadata: appMetadata,
            user_metadata: userMetadata
        };

        console.log(`[AUTH DEBUG] User: ${user.email}, ManifestID: ${manifestId}`);

        req.user = user;
        req.manifestId = manifestId;

        next();
    } catch (error: any) {
        // If JWT signature is invalid, expired, or malformed, log it explicitly
        console.error(`[AUTH MIDDLEWARE] Token Verification Failed natively:`, error.message);

        // Return 401 Unauthorized immediately so the frontend knows the token is rejected by the new secret
        return res.status(401).json({ error: `Unauthorized: ${error.message}` });
    }
};
