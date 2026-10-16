/**
 * Firebase initialisation for React Native / Expo
 *
 * Firebase JS SDK v11 no longer exports getReactNativePersistence from
 * 'firebase/auth'. Auth state is persisted via expo-secure-store in api.ts,
 * so we use inMemoryPersistence here and let our own session layer handle it.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Prevent duplicate initialisation during hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// initializeAuth must only be called once — catch the duplicate-app error on
// hot reloads and fall back to getAuth()
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: inMemoryPersistence,
  });
} catch {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export default app;
