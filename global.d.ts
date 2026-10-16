/**
 * Global type declarations for SmartCare Mobile
 *
 * React Native 0.76+ ships its own bundled TypeScript types — do NOT redeclare
 * the 'react-native' module here as it will override the real types and cause
 * missing-export errors for any component not listed.
 *
 * Only declare third-party modules that ship without types.
 */

/// <reference types="react" />

// Env variable types for Expo public env vars
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_FIREBASE_API_KEY:            string;
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN:        string;
    EXPO_PUBLIC_FIREBASE_PROJECT_ID:         string;
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET:     string;
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:string;
    EXPO_PUBLIC_FIREBASE_APP_ID:             string;
    EXPO_PUBLIC_API_URL:                     string;
  }
}
