import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { UserStore } from '../database/userStore';
import { supabase } from '../services/supabaseClient';
import { getDashboardForUser } from '../utils';
import { unsubscribeFromPush } from '../services/pushService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
    user: User | null;
    isInitialLoading: boolean;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    googleLogin: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    getDashboard: () => string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    // isInitialLoading stays true until BOTH phases of auth complete:
    //   Phase 1 — Supabase session check
    //   Phase 2 — Backend /users/profile fetch
    // Until both are done, no component may make navigation decisions.
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Prevent the SIGNED_IN listener from double-fetching on token-refresh events
    const isHandlingSignIn = useRef(false);

    // ── Phase 1+2: Session restoration on mount ───────────────────────────────
    // This runs once on cold load (page refresh). It covers the case where the
    // user is already authenticated in localStorage.
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.email) {
                    const profile = await UserStore.getByEmail(session.user.email);
                    if (profile) setUser(profile);
                }
            } catch (e) {
                console.warn('[AuthContext] Session restore failed:', e);
            } finally {
                // Phase 1+2 complete for the cold-load case
                setIsInitialLoading(false);
            }
        };
        restoreSession();
    }, []);

    // ── Supabase auth listener ────────────────────────────────────────────────
    // Handles SIGNED_IN (fresh login) and SIGNED_OUT events.
    // SIGNED_IN fetches the backend profile silently in the background.
    useEffect(() => {
        const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Always sync the realtime token when a session is active
            if (session?.access_token) {
                await supabase.realtime.setAuth(session.access_token);
            }

            if (event === 'SIGNED_IN' && session?.user?.email) {
                // Guard: ignore token-refresh events that also fire SIGNED_IN
                if (isHandlingSignIn.current) return;
                isHandlingSignIn.current = true;

                try {
                    const profile = await UserStore.getByEmail(
                        session.user.email,
                        session.access_token
                    );
                    if (profile) {
                        setUser(profile);
                        UserStore.saveSession(profile);
                    }
                } catch (e) {
                    console.warn('[AuthContext] SIGNED_IN profile fetch failed:', e);
                } finally {
                    isHandlingSignIn.current = false;
                }
            }

            if (event === 'SIGNED_OUT') {
                setUser(null);
                isHandlingSignIn.current = false;
            }
        });

        // Realtime user-profile watcher (live role/dept changes)
        const userSub = supabase
            .channel('auth:user-profile')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, payload => {
                setUser(current => {
                    if (current && payload.new?.id === current.id) {
                        // Async refresh — non-blocking; doesn't affect isInitialLoading
                        UserStore.get(current.id).then(res => {
                            if (res.status === 'success' && res.data) {
                                const profile = res.data;
                                // Task 6: Forced logout check
                                if ((profile as any).disabled || profile.role === 'revoked') {
                                    window.dispatchEvent(new CustomEvent('auth:force-logout'));
                                } else {
                                    setUser(profile);
                                    UserStore.saveSession(profile);
                                }
                            }
                        });
                    }
                    return current; // Return current synchronously; async update follows
                });
            })
            .subscribe();

        // Force-logout dispatched by api.ts on 401
        const forceLogout = () => logout();
        window.addEventListener('auth:force-logout', forceLogout);

        return () => {
            authSub.subscription.unsubscribe();
            supabase.removeChannel(userSub);
            window.removeEventListener('auth:force-logout', forceLogout);
        };
    }, []); // intentionally empty — listener is self-contained

    // ── Login (username + password) ───────────────────────────────────────────
    const login = useCallback(async (username: string, password: string) => {
        const response = await UserStore.login(username, password);
        if (response.status === 'success' && response.data) {
            setUser(response.data);
            UserStore.saveSession(response.data);
            return { success: true };
        }
        const errMsg = response.status === 'error' ? response.message : 'Invalid credentials';
        return { success: false, error: errMsg };
    }, []);

    // ── Google SSO login ──────────────────────────────────────────────────────
    // Google Identity Services bypasses Supabase auth events entirely.
    // This method stores the token and sets user state so AuthContext remains
    // the single source of truth for all login paths.
    const googleLogin = useCallback(async (email: string, token: string) => {
        // Clear any stale sessions before setting the new Google token
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('ministry_user_session'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        localStorage.setItem('google_sso_token', token);

        try {
            const profile = await UserStore.getByEmail(email, token);
            if (profile?.name) {
                setUser(profile);
                UserStore.saveSession(profile);
                return { success: true };
            }
            // Profile exists but has no name → not pre-invited
            return { success: false, error: 'Your Google email is not registered in Manifest. Please ask an Administrator to add you.' };
        } catch (e: any) {
            return { success: false, error: e.message || 'Google login failed' };
        }
    }, []);

    // ── Logout ────────────────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        try {
            await unsubscribeFromPush();
        } catch (e) {
            console.warn('[AuthContext] unsubscribe push error (non-critical):', e);
        }
        
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.warn('[AuthContext] signOut error (non-critical):', e);
        }
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('ministry_user_session') || key === 'google_sso_token')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        setUser(null);
    }, []);

    // ── Refresh current user from server ─────────────────────────────────────
    const refreshUser = useCallback(async () => {
        if (!user?.id) return;
        const res = await UserStore.get(user.id);
        if (res.status === 'success' && res.data) {
            setUser(res.data);
            UserStore.saveSession(res.data);
        }
    }, [user?.id]);

    // ── Dashboard helper ──────────────────────────────────────────────────────
    const getDashboard = useCallback(() => {
        if (!user) return '/';
        return getDashboardForUser(user);
    }, [user]);

    return (
        <AuthContext.Provider value={{
            user,
            isInitialLoading,
            isAuthenticated: !!user,
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAuth — access the current user and auth actions from any module.
 * Never drill currentUser as a prop; always use this hook.
 *
 * @example
 * const { user, isInitialLoading, logout } = useAuth();
 */
export const useAuth = (): AuthContextType => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
};

export default AuthContext;
