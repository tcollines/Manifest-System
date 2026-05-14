import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FormsUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

interface FormsAuthContextType {
  formsUser: FormsUser | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const SESSION_KEY = 'manifest_forms_user';

// ─── Context ──────────────────────────────────────────────────────────────────

const FormsAuthContext = createContext<FormsAuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const FormsAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [formsUser, setFormsUser] = useState<FormsUser | null>(() => {
    try {
      const cached = localStorage.getItem(SESSION_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const u = mapSupabaseUser(session.user);
          setFormsUser(u);
          localStorage.setItem(SESSION_KEY, JSON.stringify(u));
        } else {
          // No active supabase session — clear our local cache too
          const cached = localStorage.getItem(SESSION_KEY);
          if (cached) {
            localStorage.removeItem(SESSION_KEY);
            setFormsUser(null);
          }
        }
      } catch {
        // ignore — stay with cached user
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  // ── Sign Up ───────────────────────────────────────────────────────────────
  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) return { success: false, error: error.message };

      if (data.user) {
        // Some Supabase configs require email confirmation; handle both flows
        if (data.session) {
          const u = mapSupabaseUser(data.user, fullName);
          setFormsUser(u);
          localStorage.setItem(SESSION_KEY, JSON.stringify(u));
          return { success: true };
        } else {
          // Email confirmation required
          return { success: true, error: '__confirm_email__' };
        }
      }

      return { success: false, error: 'Sign up failed. Please try again.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'An unexpected error occurred.' };
    }
  }, []);

  // ── Sign In ───────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) return { success: false, error: error.message };

      if (data.user) {
        const u = mapSupabaseUser(data.user);
        setFormsUser(u);
        localStorage.setItem(SESSION_KEY, JSON.stringify(u));
        return { success: true };
      }

      return { success: false, error: 'Login failed. Please try again.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'An unexpected error occurred.' };
    }
  }, []);

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
    setFormsUser(null);
  }, []);

  return (
    <FormsAuthContext.Provider value={{ formsUser, isLoading, signUp, signIn, signOut }}>
      {children}
    </FormsAuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useFormsAuth = (): FormsAuthContextType => {
  const ctx = useContext(FormsAuthContext);
  if (!ctx) throw new Error('useFormsAuth must be used inside <FormsAuthProvider>');
  return ctx;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function mapSupabaseUser(user: any, overrideName?: string): FormsUser {
  return {
    id: user.id,
    email: user.email ?? '',
    full_name: overrideName ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
    avatar_url: user.user_metadata?.avatar_url,
    created_at: user.created_at ?? new Date().toISOString(),
  };
}

export default FormsAuthContext;
