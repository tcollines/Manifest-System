// ─── Firebase config for Manifest Forms ──────────────────────────────────────
// This is a completely separate Firebase project from anything else in this app.
// Project: manifest-forms (Firebase console: https://console.firebase.google.com/project/manifest-forms)

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBbMaoc6WFoujnr3htnFmjJr24V_Ca1qBs',
  authDomain: 'manifest-forms.firebaseapp.com',
  projectId: 'manifest-forms',
  storageBucket: 'manifest-forms.firebasestorage.app',
  messagingSenderId: '366050541994',
  appId: '1:366050541994:web:1d206762f1c9167c416bd3',
};

// Named app — prevents collision with any other Firebase instance in this codebase
const formsApp = initializeApp(firebaseConfig, 'manifest-forms');
const formsAuth = getAuth(formsApp);
const formsDb   = getFirestore(formsApp);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  formsApp,
  formsAuth,
  formsDb,
  googleProvider,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
};
