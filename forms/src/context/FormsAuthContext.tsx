import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  formsAuth,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from '../services/firebaseConfig';
import { setPersistence, browserSessionPersistence } from 'firebase/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FormsUser {
  // 'id' is the Firebase UID — used as owner_uid in Firestore
  // All pages must use formsUser.id (not formsUser.uid)
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  provider: 'email' | 'google';
}

interface FormsAuthContextType {
  formsUser: FormsUser | null;
  isLoading: boolean;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  signInWithEmail:  (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  // signOut: clears Firebase session — do NOT manually navigate after calling this.
  // The onAuthStateChanged → Guard will redirect to /forms/auth automatically.
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const FormsAuthContext = createContext<FormsAuthContextType | undefined>(undefined);

// ─── Map Firebase User → FormsUser ───────────────────────────────────────────

function toFormsUser(user: User, overrideName?: string): FormsUser {
  const provider: 'email' | 'google' =
    user.providerData[0]?.providerId === 'google.com' ? 'google' : 'email';
  return {
    id:         user.uid,  // Firebase UID — this is the owner_uid in Firestore
    email:      user.email ?? '',
    full_name:  overrideName ?? user.displayName ?? user.email?.split('@')[0] ?? 'User',
    avatar_url: user.photoURL ?? undefined,
    provider,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const FormsAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [formsUser, setFormsUser] = useState<FormsUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Listen to Firebase Auth state ─────────────────────────────────────────
  // Uses SESSION persistence: session clears when the browser tab is closed.
  // After signOut(), onAuthStateChanged fires with null → Guard redirects to /forms/auth.
  // Do NOT manually navigate after signOut() — that causes a race condition where the
  // auth page sees formsUser still set and immediately bounces back to /dashboard.
  useEffect(() => {
    let unsub: (() => void) | undefined;

    setPersistence(formsAuth, browserSessionPersistence)
      .catch(() => { /* ignore — fall through to subscribe anyway */ })
      .finally(() => {
        unsub = onAuthStateChanged(formsAuth, (fbUser) => {
          setFormsUser(fbUser ? toFormsUser(fbUser) : null);
          setIsLoading(false);
        });
      });

    return () => { unsub?.(); };
  }, []);

  // ── Email Sign Up ─────────────────────────────────────────────────────────
  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { user } = await createUserWithEmailAndPassword(formsAuth, email, password);
      await updateProfile(user, { displayName });
      // onAuthStateChanged will fire and update formsUser automatically
      return { success: true };
    } catch (err: any) {
      return { success: false, error: friendlyError(err.code, err.message) };
    }
  }, []);

  // ── Email Sign In ─────────────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await signInWithEmailAndPassword(formsAuth, email, password);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: friendlyError(err.code, err.message) };
    }
  }, []);

  // ── Google Sign In ────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await signInWithPopup(formsAuth, googleProvider);
      return { success: true };
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'cancelled' };
      }
      return { success: false, error: friendlyError(err.code, err.message) };
    }
  }, []);

  // ── Sign Out ──────────────────────────────────────────────────────────────
  // IMPORTANT: After calling this, do NOT manually navigate.
  // onAuthStateChanged will fire → setFormsUser(null) → Guard redirects to /forms/auth.
  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(formsAuth);
    } catch (e) {
      console.error('Firebase signOut error:', e);
    }
  }, []);

  return (
    <FormsAuthContext.Provider value={{
      formsUser,
      isLoading,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      signOut,
    }}>
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

// ─── Error messages ───────────────────────────────────────────────────────────

function friendlyError(code: string, originalMessage?: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use':    'An account with this email already exists.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/user-not-found':          'No account found with this email.',
    'auth/wrong-password':          'Incorrect password. Please try again.',
    'auth/invalid-credential':      'Incorrect email or password.',
    'auth/too-many-requests':       'Too many attempts. Please wait a moment.',
    'auth/network-request-failed':  'Network error. Check your connection.',
    'auth/popup-blocked':           'Pop-up blocked. Please allow pop-ups for this site.',
    'auth/unauthorized-domain':     'This domain is not authorized in Firebase Console.',
  };
  return map[code] ?? `Something went wrong: ${code || originalMessage || 'Unknown error'}`;
}
