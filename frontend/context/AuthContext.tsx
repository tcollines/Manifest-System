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

    // Deduplication refs
    const isHandlingSignIn = useRef(false);
    const profileFetchPromise = useRef<Promise<any> | null>(null);

    // Shared Routine: Backend metadata sync -> refreshSession -> setAuth -> realtimeAuthReady
    const prepareRealtimeAuth = useCallback(async (userEmail?: string) => {
        try {
            const targetEmail = userEmail || user?.email;
            if (targetEmail) {
                try {
                    await apiFetch(`/users/by-email?email=${encodeURIComponent(targetEmail)}`);
                } catch (e) {
                    console.warn('[AuthContext] Backend profile sync warning:', e);
                }
            }

            const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
            let activeToken = refreshData?.session?.access_token;
            
            if (!activeToken) {
                const { data: { session } } = await supabase.auth.getSession();
                activeToken = session?.access_token;
            }

            if (!activeToken) {
                setRealtimeAuthReady(false);
                return false;
            }

            await supabase.realtime.setAuth(activeToken);
            setRealtimeAuthReady(true);
            return true;
        } catch (err) {
            console.error('[AuthContext] prepareRealtimeAuth failed:', err);
            setRealtimeAuthReady(false);
            return false;
        }
    }, [user?.email]);

    // Centralized profile fetch with deduplication
    const fetchAndSyncProfile = async (email: string, token?: string) => {
        if (profileFetchPromise.current) return profileFetchPromise.current;
        
        profileFetchPromise.current = (async () => {
            try {
                const profile = await UserStore.getByEmail(email, token);
                if (profile) {
                    setUser(profile);
                    UserStore.saveSession(profile);
                    await prepareRealtimeAuth(email);
                }
                return profile;
            } catch (err) {
                console.error('[AuthContext] fetchAndSyncProfile error:', err);
                throw err;
            } finally {
                profileFetchPromise.current = null;
            }
        })();

        return profileFetchPromise.current;
    };

    // Session restoration
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.email) {
                    await fetchAndSyncProfile(session.user.email, session.access_token);
                } else {
                    const localSession = UserStore.getSession();
                    if (localSession?.email) {
                        setUser(localSession);
                        await prepareRealtimeAuth(localSession.email);
                    }
                }
            } catch (e) {
                console.error('[AuthContext] Session restoration error:', e);
            } finally {
                setIsInitialLoading(false);
            }
        };
        restoreSession();
    }, [prepareRealtimeAuth]);

    // Supabase Auth state listener
    useEffect(() => {
        const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.access_token) {
                await supabase.realtime.setAuth(session.access_token);
            }

            if (event === 'TOKEN_REFRESHED' && session?.access_token) {
                await supabase.realtime.setAuth(session.access_token);
                setRealtimeAuthReady(true);
            }

            if (event === 'SIGNED_IN' && session?.user?.email) {
                if (isHandlingSignIn.current) return;
                isHandlingSignIn.current = true;

                try {
                    await fetchAndSyncProfile(session.user.email, session.access_token);
                } catch (e) {
                    console.warn('[AuthContext] SIGNED_IN profile fetch failed:', e);
                } finally {
                    isHandlingSignIn.current = false;
                }
            }

            if (event === 'SIGNED_OUT') {
                setUser(null);
                setRealtimeAuthReady(false);
                isHandlingSignIn.current = false;
            }
        });

        return () => {
            authSub?.subscription?.unsubscribe();
        };
    }, []);

    // Login (username + password)
    const login = useCallback(async (username: string, password: string) => {
        const response = await UserStore.login(username, password);
        if (response.status === 'success' && response.data) {
            setUser(response.data);
            UserStore.saveSession(response.data);
            await prepareRealtimeAuth(response.data.email);
            return { success: true, user: response.data };
        }
        const errMsg = response.status === 'error' ? response.message : 'Invalid credentials';
        return { success: false, error: errMsg };
    }, [prepareRealtimeAuth]);

    // Google SSO login
    const googleLogin = useCallback(async (email: string, token: string) => {
        try {
            const { data: sData, error: sErr } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: token
            });

            if (sErr || !sData?.session) {
                console.error('[AuthContext] Google signInWithIdToken failed:', sErr);
                setRealtimeAuthReady(false);
                return { success: false, error: 'Google authentication failed: ' + (sErr?.message || 'Invalid session') };
            }

            const profile = await UserStore.getByEmail(email, sData.session.access_token);
            if (profile?.name) {
                setUser(profile);
                UserStore.saveSession(profile);
                await prepareRealtimeAuth(email);
                return { success: true, user: profile };
            }
            return { success: false, error: 'Your Google email is not registered in Manifest. Please ask an Administrator to add you.' };
        } catch (e: any) {
            setRealtimeAuthReady(false);
            return { success: false, error: e.message || 'Google login failed' };
        }
    }, [prepareRealtimeAuth]);

    // Logout
    const logout = useCallback(async () => {
        try {
            if (user?.id) {
                analyticsService.track({
                    eventType: 'USER_LOGOUT',
                    userId: user.id,
                    metadata: { role: user.role }
                });
                await unsubscribeFromPush(user.id);
            }
            await supabase.auth.signOut();
        } catch (e) {
            console.warn('[AuthContext] SignOut error:', e);
        } finally {
            setUser(null);
            setRealtimeAuthReady(false);
            UserStore.clearSession();
            queryClient.clear();
            localStorage.removeItem('google_sso_token');
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
