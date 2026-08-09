import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Persist the auth session in localStorage (survives browser restarts, tab
// closes, and PWA relaunches) instead of Firebase's sessionStorage default.
// Set at module init, before any sign-in call can occur, so it's always in
// effect by the time the user interacts with the app. Doesn't affect
// onAuthStateChanged — that still fires the same way, just from a
// longer-lived stored session.
//
// Exported so sign-in flows can explicitly await it before calling
// signInWithPopup/signInWithEmailAndPassword: setPersistence() is async, and
// leaving it fire-and-forget left a (narrow, but real) race where a sign-in
// call could complete before the persistence switch had actually landed.
// Resolves even on failure — a persistence error falls back to Firebase's
// default persistence rather than blocking sign-in outright.
export const authReady: Promise<void> = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error);
});

// Modern persistent cache with multi-tab support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});