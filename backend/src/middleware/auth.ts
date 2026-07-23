import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Extend Express Request interface
declare global {
    namespace Express {
        interface Request {
            user?: any;
            manifestId?: string;
        }
    }
}

interface JwksCache {
    keys: Record<string, string>;
    expiresAt: number;
}

let jwksCache: JwksCache | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchJWKS(): Promise<Record<string, string>> {
    const now = Date.now();
    if (jwksCache && now < jwksCache.expiresAt) {
        return jwksCache.keys;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) return {};

    const jwksUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;

    try {
        const response = await fetch(jwksUrl);
        if (!response.ok) return {};

        const data = await response.json();
        const keys: Record<string, string> = {};

        if (data && Array.isArray(data.keys)) {
            for (const key of data.keys) {
                if (key.kid && key.kty === 'EC' && key.crv === 'P-256') {
                    const pem = crypto
                        .createPublicKey({ key, format: 'jwk' })
                        .export({ type: 'spki', format: 'pem' });

                    keys[key.kid] = pem as string;
                }
            }
        }

        jwksCache = { keys, expiresAt: now + CACHE_TTL_MS };
        return keys;
    } catch (error) {
        console.warn('[AUTH WARN] Failed to fetch JWKS from Supabase:', error);
        return {};
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
        }

        const token = authHeader.split(' ')[1];
        let decoded: any = null;

        // 1. Try verifying via HS256 if SUPABASE_JWT_SECRET is set
        const jwtSecret = process.env.SUPABASE_JWT_SECRET;
        if (jwtSecret) {
            try {
                decoded = jwt.verify(token, jwtSecret);
            } catch (hsErr) {
                // Ignore and try ES256 / JWKS
            }
        }

        // 2. Try verifying via ES256 / JWKS if not decoded yet
        if (!decoded) {
            try {
                const keys = await fetchJWKS();
                const decodedHeader = jwt.decode(token, { complete: true }) as any;
                const kid = decodedHeader?.header?.kid;
                const signingKey = kid ? keys[kid] : null;

                if (signingKey) {
                    decoded = jwt.verify(token, signingKey, { algorithms: ['ES256'] });
                }
            } catch (esErr) {
                // Ignore
            }
        }

        // Never trust unverified jwt.decode(). If token verification failed, reject immediately.
        if (!decoded || !decoded.sub || !decoded.email) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or unverified token' });
        }

        // Normalize verified JWT identity
        const verifiedSub = String(decoded.sub);
        const verifiedEmail = String(decoded.email);

        req.user = {
            ...decoded,
            id: verifiedSub,
            authUserId: verifiedSub,
            email: verifiedEmail
        };

        // Securely resolve profile & manifestId from public.users using adminClient
        const { createClient } = require('@supabase/supabase-js');
        const adminClient = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

        // First attempt: match by id (GoTrue auth id)
        const { data: idData } = await adminClient
            .from('users')
            .select('id, manifest_id, email, role')
            .eq('id', verifiedSub)
            .neq('status', 'Deleted');

        let resolvedProfile: any = null;

        if (idData && idData.length === 1) {
            resolvedProfile = idData[0];
        } else if (idData && idData.length > 1) {
            console.error(`[AUTH] Ambiguous multiple user rows found for auth ID: ${verifiedSub}`);
            return res.status(401).json({ error: 'Unauthorized: Ambiguous profile match for user ID' });
        } else {
            // Second attempt: match by verified email for legacy accounts where public.users.id differs from decoded.sub
            const { data: emailData } = await adminClient
                .from('users')
                .select('id, manifest_id, email, role')
                .eq('email', verifiedEmail)
                .neq('status', 'Deleted');

            if (emailData && emailData.length === 1) {
                resolvedProfile = emailData[0];
                console.log(`[AUTH] Profile resolved via verified email for legacy user: ${verifiedEmail}`);
            } else if (emailData && emailData.length > 1) {
                // Reject ambiguous duplicate-email matches instead of selecting arbitrarily
                console.error(`[AUTH] Ambiguous duplicate email profiles found for verified email: ${verifiedEmail}`);
                return res.status(401).json({ error: 'Unauthorized: Ambiguous profile match for email' });
            }
        }

        // Resolve manifestId only from securely resolved public.users profile or a verified matching JWT claim
        let resolvedManifestId = resolvedProfile?.manifest_id || decoded.app_metadata?.manifest_id || decoded.manifest_id;

        if (!resolvedManifestId) {
            console.error(`[AUTH] Unable to securely resolve manifestId for ${verifiedEmail}`);
            return res.status(401).json({ error: 'Unauthorized: Missing manifest association' });
        }

        if (resolvedProfile) {
            req.user.profileId = resolvedProfile.id;
            req.user.role = resolvedProfile.role;
            req.user.manifest_id = resolvedProfile.manifest_id;
        }

        req.manifestId = resolvedManifestId;
        next();
    } catch (err: any) {
        console.error('[AUTH ERROR]', err);
        return res.status(401).json({ error: 'Unauthorized: Authentication failed' });
    }
};