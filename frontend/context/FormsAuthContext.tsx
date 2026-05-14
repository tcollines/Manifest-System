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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FormsUser {
  id: string;           // Firebase Auth UID — used as owner_uid in Firestore
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

interface FormsAuthContextType {
  formsUser: FormsUser | null;
  isLoading: boolean;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signInWithEmail:  (email: string, password: string)                  => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: ()                                                  => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const FormsAuthContext = createContext<FormsAuthContextType | undefined>(undefined);

// ─── Map Firebase User → FormsUser ───────────────────────────────────────────

function toFormsUser(user: User): FormsUser {
  return {
    id:         user.uid,                                          // Firebase UID → owner_uid in Firestore
    email:      user.email ?? '',
    full_name:  user.displayName ?? user.email?.split('@')[0] ?? 'User',
    avatar_url: user.photoURL ?? undefined,
    created_at: user.metadata.creationTime ?? new Date().toISOString(),
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const FormsAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [formsUser, setFormsUser] = useState<FormsUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to Firebase Auth state — single source of truth
  useEffect(() => {
    const unsub = onAuthStateChanged(formsAuth, (firebaseUser) => {
      setFormsUser(firebaseUser ? toFormsUser(firebaseUser) : null);
      setIsLoading(false);
    });
    return unsub; // cleanup on unmount
  }, []);

  // ── Email Sign Up ─────────────────────────────────────────────────────────
  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    fullName: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { user } = await createUserWithEmailAndPassword(formsAuth, email, password);
      // Save display name on the Firebase Auth profile
      await updateProfile(user, { displayName: fullName });
      // onAuthStateChanged will fire and update formsUser automatically
      return { success: true };
    } catch (e: any) {
      return { success: false, error: friendlyError(e.code) };
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
    } catch (e: any) {
      return { success: false, error: friendlyError(e.code) };
    }
  }, []);

  // ── Google Sign In ────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await signInWithPopup(formsAuth, googleProvider);
      return { success: true };
    } catch (e: any) {
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'cancelled' };
      }
      return { success: false, error: friendlyError(e.code) };
    }
  }, []);

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await firebaseSignOut(formsAuth);
    // onAuthStateChanged sets formsUser to null automatically
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

function friendlyError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':    return 'An account with this email already exists.';
    case 'auth/invalid-email':           return 'Please enter a valid email address.';
    case 'auth/weak-password':           return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':      return 'Incorrect email or password.';
    case 'auth/too-many-requests':       return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':  return 'Network error. Check your connection.';
    case 'auth/popup-blocked':           return 'Popup blocked by browser. Please allow popups.';
    default:                             return 'Something went wrong. Please try again.';
  }
}

export default FormsAuthContext;
