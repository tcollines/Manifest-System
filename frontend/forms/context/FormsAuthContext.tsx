import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  formsAuth,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from '../services/firebaseConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FormsUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider: 'email' | 'google';
}

interface FormsAuthContextType {
  formsUser: FormsUser | null;
  firebaseUser: User | null;
  isLoading: boolean;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOutForms: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const FormsAuthContext = createContext<FormsAuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const FormsAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [formsUser, setFormsUser] = useState<FormsUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Listen to Firebase Auth state ─────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(formsAuth, (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        setFormsUser(mapFirebaseUser(fbUser));
      } else {
        setFirebaseUser(null);
        setFormsUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Email Sign Up ─────────────────────────────────────────────────────────
  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { user } = await createUserWithEmailAndPassword(formsAuth, email, password);
      // Attach display name immediately
      await updateProfile(user, { displayName });
      setFormsUser(mapFirebaseUser(user, displayName, 'email'));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: friendlyError(err.code) };
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
      return { success: false, error: friendlyError(err.code) };
    }
  }, []);

  // ── Google Sign In ────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await signInWithPopup(formsAuth, googleProvider);
      return { success: true };
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return { success: false, error: 'cancelled' };
      return { success: false, error: friendlyError(err.code) };
    }
  }, []);

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const signOutForms = useCallback(async () => {
    await signOut(formsAuth);
  }, []);

  return (
    <FormsAuthContext.Provider
      value={{
        formsUser,
        firebaseUser,
        isLoading,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signOutForms,
      }}
    >
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapFirebaseUser(user: User, overrideName?: string, overrideProvider?: 'email' | 'google'): FormsUser {
  const provider: 'email' | 'google' =
    overrideProvider ??
    (user.providerData[0]?.providerId === 'google.com' ? 'google' : 'email');

  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: overrideName ?? user.displayName ?? user.email?.split('@')[0] ?? 'User',
    photoURL: user.photoURL ?? undefined,
    provider,
  };
}

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use':    'An account with this email already exists.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/user-not-found':          'No account found with this email.',
    'auth/wrong-password':          'Incorrect password. Please try again.',
    'auth/too-many-requests':       'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed':  'Network error. Check your connection and try again.',
    'auth/popup-blocked':           'Pop-up was blocked. Please allow pop-ups for this site.',
    'auth/invalid-credential':      'Incorrect email or password.',
  };
  return map[code] ?? 'Something went wrong. Please try again.';
}

// Named exports only — FormsAuthProvider + useFormsAuth
