import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Admin Council Authentication Middleware
 * 
 * Verifies the Bearer JWT token via Supabase JWKS/HS256,
 * then checks that the decoded email exists in the `admin_council_users` table.
 * Rejects with 403 if the user is not an Admin Council member.
 */

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
        console.warn('[ADMIN-COUNCIL AUTH] Failed to fetch JWKS:', error);
        return {};
    }
}

export const adminCouncilAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
        }

        const token = authHeader.split(' ')[1];
        let decoded: any = null;

        // 1. Try HS256 with JWT secret
        const jwtSecret = process.env.SUPABASE_JWT_SECRET;
        if (jwtSecret) {
            try {
                decoded = jwt.verify(token, jwtSecret);
            } catch (_) {
                // Try ES256 next
            }
        }

        // 2. Try ES256 via JWKS
        if (!decoded) {
            try {
                const keys = await fetchJWKS();
                const decodedHeader = jwt.decode(token, { complete: true }) as any;
                const kid = decodedHeader?.header?.kid;
                const signingKey = kid ? keys[kid] : null;

                if (signingKey) {
                    decoded = jwt.verify(token, signingKey, { algorithms: ['ES256'] });
                }
            } catch (_) {
                // Fall through
            }
        }

        if (!decoded || !decoded.sub || !decoded.email) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or unverified token' });
        }

        const verifiedEmail = String(decoded.email).toLowerCase().trim();

        // 3. Verify the user is in admin_council_users
        const { supabase } = require('../supabase');
        
        let councilUser = null;
        let councilError = null;
        
        // Retry up to 3 times to mitigate fetch/DNS timeouts
        for (let attempt = 1; attempt <= 3; attempt++) {
            const result = await supabase
                .from('admin_council_users')
                .select('id, email, name, role')
                .eq('email', verifiedEmail)
                .single();
                
            if (!result.error && result.data) {
                councilUser = result.data;
                councilError = null;
                break;
            } else if (result.error && result.error.code !== 'PGRST116') {
                // If it's a connection error, retry
                councilError = result.error;
                console.warn(`[ADMIN-COUNCIL AUTH] DB query attempt ${attempt} failed:`, result.error.message);
                await new Promise(r => setTimeout(r, 1000));
            } else {
                // Not found error (PGRST116) or other hard error
                councilError = result.error;
                break;
            }
        }

        if (councilError || !councilUser) {
            console.warn(`[ADMIN-COUNCIL AUTH] Access denied for ${verifiedEmail} — not in admin_council_users or query failed.`);
            return res.status(403).json({ error: 'Forbidden: Not an Admin Council member' });
        }

        // Attach admin council user info to request
        (req as any).adminUser = {
            id: councilUser.id,
            email: councilUser.email,
            name: councilUser.name,
            role: councilUser.role,
            authUserId: String(decoded.sub),
        };

        next();
    } catch (err: any) {
        console.error('[ADMIN-COUNCIL AUTH ERROR]', err);
        return res.status(401).json({ error: 'Unauthorized: Authentication failed' });
    }
};
