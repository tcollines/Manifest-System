import { Request, Response, NextFunction } from 'express';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// ------------------------------------------------------------------------
// Extend Express Request interface
// ------------------------------------------------------------------------
declare global {
    namespace Express {
        interface Request {
            user?: any;
            manifestId?: string;
        }
    }
}

// ------------------------------------------------------------------------
// ES256 JWKS KEY MANAGEMENT
// ------------------------------------------------------------------------
interface JwksCache {
    keys: Record<string, string>;
    expiresAt: number;
}

let jwksCache: JwksCache | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ------------------------------------------------------------------------
// Fetch Supabase JWKS (.well-known endpoint)
// ------------------------------------------------------------------------
async function fetchJWKS(): Promise<Record<string, string>> {
    const now = Date.now();

    // Serve from cache if valid
    if (jwksCache && now < jwksCache.expiresAt) {
        return jwksCache.keys;
    }

    const supabaseUrl = process.env.SUPABASE_URL;

    if (!supabaseUrl) {
        throw new Error('SUPABASE_URL is missing in environment variables.');
    }

    // ✅ CORRECT SUPABASE JWKS ENDPOINT
    const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;

    try {
        const response = await fetch(jwksUrl);

        if (!response.ok) {
            console.error(`[AUTH ERROR] JWKS fetch failed with status code: ${response.status}`);
            throw new Error(`JWKS endpoint returned ${response.status}`);
        }

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

        if (Object.keys(keys).length === 0) {
            throw new Error("No valid ES256 keys found in JWKS response.");
        }

        jwksCache = {
            keys,
            expiresAt: now + CACHE_TTL_MS
        };

        console.log("[AUTH] JWKS successfully refreshed.");
        return keys;

    } catch (error) {
        console.error('[AUTH ERROR] Failed to fetch JWKS from Supabase:', error);
        throw error;
    }
}

// ------------------------------------------------------------------------
// Key Resolver
// ------------------------------------------------------------------------
function getKey(header: JwtHeader, callback: SigningKeyCallback) {
    if (header.alg !== 'ES256') {
        return callback(new Error(`Invalid token algorithm: Expected ES256, but received ${header.alg}`));
    }

    if (!header.kid) {
        return callback(new Error('Missing kid in token header'));
    }

    fetchJWKS()
        .then((keys) => {
            const signingKey = keys[header.kid as string];

            if (!signingKey) {
                return callback(new Error(`No matching public key found for kid: ${header.kid}`));
            }

            callback(null, signingKey);
        })
        .catch((error) => {
            callback(error);
        });
}

// ------------------------------------------------------------------------
// STARTUP VALIDATION
// ------------------------------------------------------------------------
(async () => {
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!supabaseUrl) {
        console.error(`[AUTH STARTUP FATAL] ❌ SUPABASE_URL is missing.`);
        process.exit(1);
    }

    try {
        await fetchJWKS();
        console.log(`[AUTH STARTUP] ✅ JWKS cached. ES256 verification ready.`);
    } catch (error: any) {
        console.error(`[AUTH STARTUP ERROR] ❌ Failed to fetch JWKS.`);
        console.error(`Message: ${error.message}`);
    }
})();

// ------------------------------------------------------------------------
// PURE ES256 STATELESS MIDDLEWARE
// ------------------------------------------------------------------------
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
        }

        const token = authHeader.split(' ')[1];

        // --- GOOGLE AUTH BYPASS ---
        const decodedRaw = jwt.decode(token);
        if (decodedRaw && typeof decodedRaw === 'object' && decodedRaw.iss && (decodedRaw.iss === 'https://accounts.google.com' || decodedRaw.iss === 'accounts.google.com')) {
            try {
                const ticket = await googleClient.verifyIdToken({
                    idToken: token,
                    audience: process.env.GOOGLE_CLIENT_ID, 
                });
                const payload = ticket.getPayload();
                if (!payload || !payload.email) {
                    return res.status(401).json({ error: 'Unauthorized: Invalid Google Token Claims' });
                }

                // Verify user exists in database and get manifestId
                const { createClient } = require('@supabase/supabase-js');
                const adminClient = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

                const { data, error } = await adminClient.from('users').select('id, role, manifest_id, email').eq('email', payload.email).single();

                if (error || !data) {
                    return res.status(403).json({ error: 'User not registered. Please ask an Administrator to add your Google email.' });
                }

                if (['Vehicle Coordinator', 'Stage Coordinator', 'Coordinator'].includes(data.role)) {
                    return res.status(403).json({ error: 'Temporary users (coordinators) are not allowed to log in via Google SSO. Please use username and password.' });
                }

                req.user = {
                    id: data.id,
                    email: data.email,
                    role: data.role,
                    app_metadata: { manifest_id: data.manifest_id },
                    user_metadata: {}
                };
                req.manifestId = data.manifest_id;
                
                // CRITICAL: Call next() and return immediately to bypass the Supabase verification below
                next();
                return;
            } catch (e: any) {
                console.error('[AUTH GOOGLE BYPASS ERROR]', e.message);
                return res.status(401).json({ error: `Unauthorized: Google Token Error: ${e.message}` });
            }
        }
        // --- END GOOGLE AUTH BYPASS ---

        const supabaseUrl = process.env.SUPABASE_URL;

        if (!supabaseUrl) {
            console.error('[AUTH FATAL] Missing SUPABASE_URL.');
            return res.status(500).json({ error: 'Internal Server Error: Auth Configuration Missing' });
        }

        const expectedIssuer = `${supabaseUrl}/auth/v1`;

        jwt.verify(
            token,
            getKey,
            {
                algorithms: ["ES256"],
                audience: "authenticated",
                issuer: expectedIssuer
            },
            (err, decodedRaw) => {
                if (err) {
                    console.warn(`[AUTH] Token Verification Failed:`, err.message);
                    return res.status(401).json({ error: `Unauthorized: ${err.message}` });
                }

                const decoded = decodedRaw as any;

                if (!decoded || !decoded.sub || !decoded.email) {
                    return res.status(401).json({ error: 'Unauthorized: Invalid Token Claims' });
                }

                // 🚨 STRICT RLS ALIGNMENT
                // Look in top-level FIRST (legacy), then app_metadata (Supabase Auth Hook standard)
                let manifestId = decoded.manifest_id || decoded.app_metadata?.manifest_id;

                if (!manifestId) {
                    console.warn(`[AUTH FIX] Missing manifest_id in JWT for ${decoded.email}. Attempting auto-recovery for SSO user...`);

                    // The Express middleware is stateless but we can afford a DB lookup for first-time Google SSO users
                    // who just got their Auth account created without the custom auth hook populating it yet.
                    const { createClient } = require('@supabase/supabase-js');
                    const adminClient = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

                    adminClient.from('users').select('manifest_id, id').eq('email', decoded.email).single()
                        .then(({ data, error }: any) => {
                            if (error || !data) {
                                console.error(`[AUTH REDIRECT] No public.users record found to sync against for ${decoded.email}`);
                                // Do not return 401 yet, since the frontend `/users/profile` will 404 cleanly and redirect to setup-account
                                // We mock a safe manifestId or drop through to let the endpoint decide? No, we MUST have a manifestId.
                                // However, if they don't exist in DB, they can't belong to a tenant.
                                // We can't next() if we don't have a manifestId.
                                return res.status(401).json({ error: 'Unauthorized: Missing manifest_id claim and no DB profile found.' });
                            }

                            console.log(`[AUTH SYNC] Binding Google SSO User ${decoded.email} to tenant ${data.manifest_id}`);

                            // Patch the GoTrue Identity for future tokens
                            adminClient.auth.admin.updateUserById(decoded.sub, {
                                app_metadata: { ...decoded.app_metadata, manifest_id: data.manifest_id }
                            }).catch((e: any) => console.error("Failed to patch auth user:", e));

                            // Proceed natively
                            req.user = {
                                id: data.id, // Overwrite with public DB ID to fix auth ID desync
                                email: decoded.email,
                                role: decoded.role,
                                app_metadata: { ...decoded.app_metadata, manifest_id: data.manifest_id },
                                user_metadata: decoded.user_metadata || {}
                            };
                            req.manifestId = data.manifest_id;
                            next();
                        });
                    return; // Pause execution for async branch
                }

                const user = {
                    id: decoded.sub,
                    email: decoded.email,
                    role: decoded.role,
                    app_metadata: decoded.app_metadata || {},
                    user_metadata: decoded.user_metadata || {}
                };

                req.user = user;
                req.manifestId = manifestId;

                next();
            }
        );

    } catch (error: any) {
        console.error(`[AUTH FATAL ERROR]`, error);
        return res.status(401).json({ error: 'Unauthorized: Internal Error During Verification' });
    }
};