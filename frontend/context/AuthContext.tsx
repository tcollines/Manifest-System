import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '../types';
import { UserStore } from '../database/userStore';
import { supabase } from '../services/supabaseClient';
import { getDashboardForUser } from '../utils';
import { unsubscribeFromPush } from '../services/pushService';
import { analyticsService } from '../services/analyticsService';
import { apiFetch } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
    user: User | null;
    isInitialLoading: boolean;
    isAuthenticated: boolean;
    realtimeAuthReady: boolean;
    verifiedRealtimeManifestId: string | null;
    login: (username: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
    googleLogin: (email: string, token: string) => Promise<{ success: boolean; user?: User; error?: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    getDashboard: () => string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<User | null>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [realtimeAuthReady, setRealtimeAuthReady] = useState(false);
    const [verifiedRealtimeManifestId, setVerifiedRealtimeManifestId] = useState<string | null>(null);

    const isHandlingSignIn = useRef(false);
    const authGenRef = useRef(0);

    // Complete Phase 3 Auth Preparation Pipeline
    const completeAuthPreparation = useCallback(async (token: string, email: string) => {
        setRealtimeAuthReady(false);
        setVerifiedRealtimeManifestId(null);
        const currentGen = ++authGenRef.current;

        try {
            // 1. Resolve trusted profile from backend
            const profile = await UserStore.getByEmail(email, token);
            if (!profile || !profile.manifestId) {
                throw new Error('User profile or manifestId missing');
            }

            // 2. Check if app_metadata.manifest_id is in current session
            let activeToken = token;
            const currentSession = (await supabase.auth.getSession()).data.session;
            let jwtManifestId = currentSession?.user?.app_metadata?.manifest_id;

            if (jwtManifestId !== profile.manifestId) {
                // Call secure backend sync endpoint; DO NOT swallow error
                await apiFetch('/users/sync-manifest', { method: 'POST', token: activeToken });

                // Refresh session to acquire updated JWT claim
                const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
                if (refreshErr || !refreshData?.session?.access_token) {
                    throw new Error('Session refresh failed after claims sync: ' + (refreshErr?.message || 'No session'));
                }
                activeToken = refreshData.session.access_token;
                jwtManifestId = refreshData.session.user?.app_metadata?.manifest_id;
            }

            // 3. Exact equality check required (never truthy-only comparison)
            if (jwtManifestId !== profile.manifestId) {
                throw new Error(`JWT tenant claim mismatch: expected ${profile.manifestId}, got ${jwtManifestId}`);
            }

            // 4. Bind Realtime auth
            await supabase.realtime.setAuth(activeToken);

            if (currentGen !== authGenRef.current) {
                console.warn('[REG-RT] Stale auth preparation completed; ignoring state update');
                return profile;
            }

            setVerifiedRealtimeManifestId(profile.manifestId);
            setRealtimeAuthReady(true);

            profile.token = activeToken;
            UserStore.saveSession(profile);
            setUser(profile);
            return profile;
        } catch (err) {
            console.error('[REG-RT] Auth preparation failed:', err);
            if (currentGen === authGenRef.current) {
                setRealtimeAuthReady(false);
                setVerifiedRealtimeManifestId(null);
                setUser(null);
            }
            throw err;
        }
    }, []);

    // Session restoration on mount
    useEffect(() => {
        let isMounted = true;

        const maxSplashTimeout = setTimeout(() => {
            if (isMounted) {
                setIsInitialLoading(false);
            }
        }, 2500);

        const restoreSession = async () => {
            try {
                const sessionRes = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise<{ data: { session: null } }>((resolve) =>
                        setTimeout(() => resolve({ data: { session: null } }), 1500)
                    )
                ]);

                const session = sessionRes?.data?.session;

                if (session?.user?.email) {
                    await completeAuthPreparation(session.access_token, session.user.email);
                } else {
                    const localSession = UserStore.getSession();
                    if (localSession?.email && localSession?.token) {
                        await completeAuthPreparation(localSession.token, localSession.email);
                    }
                }
            } catch (e) {
                console.error('[AuthContext] Session restoration failed:', e);
            } finally {
                clearTimeout(maxSplashTimeout);
                if (isMounted) {
                    setIsInitialLoading(false);
                }
            }
        };

        restoreSession();

        return () => {
            isMounted = false;
            clearTimeout(maxSplashTimeout);
        };
    }, [completeAuthPreparation]);

    // Supabase Auth listener (Deferred outside callback to avoid auth-lock problems)
    useEffect(() => {
        const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
            setTimeout(() => {
                if (event === 'TOKEN_REFRESHED' && session?.access_token && user?.manifestId) {
                    const refreshedJwtManifest = session.user?.app_metadata?.manifest_id;
                    if (refreshedJwtManifest === user.manifestId) {
                        supabase.realtime.setAuth(session.access_token)
                            .then(() => {
                                setVerifiedRealtimeManifestId(user.manifestId || null);
                                setRealtimeAuthReady(true);
                            })
                            .catch(() => {
                                setRealtimeAuthReady(false);
                                setVerifiedRealtimeManifestId(null);
                            });
                    } else {
                        setRealtimeAuthReady(false);
                        setVerifiedRealtimeManifestId(null);
                    }
                }

                if (event === 'SIGNED_IN' && session?.user?.email) {
                    if (isHandlingSignIn.current) return;
                    isHandlingSignIn.current = true;

                    completeAuthPreparation(session.access_token, session.user.email)
                        .catch((e) => console.warn('[AuthContext] SIGNED_IN prep failed:', e))
                        .finally(() => { isHandlingSignIn.current = false; });
                }

                if (event === 'SIGNED_OUT') {
                    authGenRef.current++;
                    setUser(null);
                    setRealtimeAuthReady(false);
                    setVerifiedRealtimeManifestId(null);
                    isHandlingSignIn.current = false;
                }
            }, 0);
        });

        return () => {
            authSub?.subscription?.unsubscribe();
        };
    }, [completeAuthPreparation, user?.manifestId]);

    // Login (username + password)
    const login = useCallback(async (username: string, password: string) => {
        const response = await UserStore.login(username, password);
        if (response.status === 'success' && response.data && response.data.email && response.data.token) {
            try {
                const profile = await completeAuthPreparation(response.data.token, response.data.email);
                return { success: true, user: profile };
            } catch (err: any) {
                return { success: false, error: err.message || 'Authentication preparation failed' };
            }
        }
        const errMsg = response.status === 'error' ? response.message : 'Invalid credentials';
        return { success: false, error: errMsg };
    }, [completeAuthPreparation]);

    // Google SSO login using signInWithIdToken()
    const googleLogin = useCallback(async (email: string, token: string) => {
        try {
            const { data: sData, error: sErr } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: token
            });

            if (sErr || !sData?.session) {
                console.error('[AuthContext] Google signInWithIdToken failed:', sErr);
                setRealtimeAuthReady(false);
                setVerifiedRealtimeManifestId(null);
                return { success: false, error: 'Google authentication failed: ' + (sErr?.message || 'Invalid session') };
            }

            const profile = await completeAuthPreparation(sData.session.access_token, email);
            return { success: true, user: profile };
        } catch (e: any) {
            console.error('[AuthContext] Google login error:', e);
            setRealtimeAuthReady(false);
            setVerifiedRealtimeManifestId(null);
            return { success: false, error: e.message || 'Google login failed' };
        }
    }, [completeAuthPreparation]);

    // Logout
    const logout = useCallback(async () => {
        authGenRef.current++;
        const userId = user?.id;

        if (userId) {
            try {
                await analyticsService.trackEvent({
                    eventType: 'USER_LOGOUT',
                    userId,
                    metadata: { role: user?.role }
                });
            } catch (aErr) {
                console.warn('[AuthContext] Analytics track logout warning:', aErr);
            }

            try {
                await unsubscribeFromPush(userId);
            } catch (pErr) {
                console.warn('[AuthContext] Push unsubscribe warning:', pErr);
            }
        }

        try {
            await supabase.auth.signOut();
        } catch (sErr) {
            console.warn('[AuthContext] SignOut error:', sErr);
        } finally {
            setUser(null);
            setRealtimeAuthReady(false);
            setVerifiedRealtimeManifestId(null);
            UserStore.clearSession();
            queryClient.clear();
        }
    }, [user, queryClient]);

    const refreshUser = useCallback(async () => {
        if (!user?.email) return;
        try {
            const updated = await UserStore.getByEmail(user.email);
            if (updated) {
                setUser(updated);
                UserStore.saveSession(updated);
            }
        } catch (e) {
            console.warn('[AuthContext] refreshUser failed:', e);
        }
    }, [user]);

    const getDashboard = useCallback(() => {
        return getDashboardForUser(user);
    }, [user]);

    return (
        <AuthContext.Provider value={{
            user,
            isInitialLoading,
            isAuthenticated: !!user,
            realtimeAuthReady,
            verifiedRealtimeManifestId,
            login,
            googleLogin,
            logout,
            refreshUser,
            getDashboard,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
};

export default AuthContext;
