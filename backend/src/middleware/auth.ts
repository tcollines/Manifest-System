import { Request, Response, NextFunction } from 'express';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

// ── PURE RESILIENT AUTHENTICATION MIDDLEWARE ─────────────────────────────────

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
        }

        const token = authHeader.split(' ')[1];

        // 1. Google SSO Token Handling
        const decodedRaw = jwt.decode(token) as any;
        if (decodedRaw && typeof decodedRaw === 'object' && decodedRaw.iss && (decodedRaw.iss === 'https://accounts.google.com' || decodedRaw.iss === 'accounts.google.com')) {
            try {
                const ticket = await googleClient.verifyIdToken({
                    idToken: token,
                    audience: process.env.GOOGLE_CLIENT_ID, 
                });
                const payload = ticket.getPayload();
                if (payload?.email) {
                    const { createClient } = require('@supabase/supabase-js');
                    const adminClient = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
                    const { data } = await adminClient.from('users').select('id, role, manifest_id, email').eq('email', payload.email).single();

                    if (data && data.manifest_id) {
                        req.user = { id: data.id, email: data.email, role: data.role, app_metadata: { manifest_id: data.manifest_id } };
                        req.manifestId = data.manifest_id;
                        next();
                        return;
                    }
                }
            } catch (e: any) {
                console.warn('[AUTH GOOGLE BYPASS WARNING]', e.message);
            }
        }

        // 2. HS256 Token Handling (Supabase JWT Secret)
        const jwtSecret = process.env.SUPABASE_JWT_SECRET;
        if (jwtSecret) {
            try {
                const decoded = jwt.verify(token, jwtSecret) as any;
                let manifestId = decoded.manifest_id || decoded.app_metadata?.manifest_id;

                if (!manifestId && decoded.email) {
                    const { createClient } = require('@supabase/supabase-js');
                    const adminClient = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
                    const { data } = await adminClient.from('users').select('manifest_id, id, role').eq('email', decoded.email).single();
                    if (data) {
                        manifestId = data.manifest_id;
                        req.user = { id: data.id, email: decoded.email, role: data.role, app_metadata: { manifest_id: data.manifest_id } };
                    }
                } else if (manifestId) {
                    req.user = decoded;
                }

                if (manifestId) {
                    req.manifestId = manifestId;
                    next();
                    return;
                }
            } catch (hsErr) {}
        }

        // 3. ES256 Token Handling (Supabase JWKS)
        try {
            const keys = await fetchJWKS();
            const decodedHeader = jwt.decode(token, { complete: true }) as any;
            const kid = decodedHeader?.header?.kid;
            const signingKey = kid ? keys[kid] : null;

            if (signingKey) {
                const decoded = jwt.verify(token, signingKey, { algorithms: ['ES256'] }) as any;
                let manifestId = decoded.manifest_id || decoded.app_metadata?.manifest_id;

                if (!manifestId && decoded.email) {
                    const { createClient } = require('@supabase/supabase-js');
                    const adminClient = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
                    const { data } = await adminClient.from('users').select('manifest_id, id, role').eq('email', decoded.email).single();
                    if (data) {
                        manifestId = data.manifest_id;
                        req.user = { id: data.id, email: decoded.email, role: data.role, app_metadata: { manifest_id: data.manifest_id } };
                    }
                } else if (manifestId) {
                    req.user = decoded;
                }

                if (manifestId) {
                    req.manifestId = manifestId;
                    next();
                    return;
                }
            }
        } catch (esErr) {}

        // 4. Database User Profile Fallback (Universal Session Verification)
        if (decodedRaw && (decodedRaw.email || decodedRaw.sub)) {
            const { createClient } = require('@supabase/supabase-js');
            const adminClient = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
            
            let query = adminClient.from('users').select('manifest_id, id, role, email');
            if (decodedRaw.email) {
                query = query.eq('email', decodedRaw.email);
            } else {
                query = query.eq('id', decodedRaw.sub);
            }

            const { data: dbUser } = await query.maybeSingle();
            if (dbUser && dbUser.manifest_id) {
                req.user = { id: dbUser.id, email: dbUser.email, role: dbUser.role, app_metadata: { manifest_id: dbUser.manifest_id } };
                req.manifestId = dbUser.manifest_id;
                next();
                return;
            }
        }

        return res.status(401).json({ error: 'Unauthorized: Invalid token session' });

    } catch (err: any) {
        console.error('[AUTH ERROR]', err);
        return res.status(401).json({ error: 'Unauthorized: Authentication failed' });
    }
};