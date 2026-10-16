/**
 * SmartCare API client
 *
 * Auth is now handled by Firebase. Each request attaches the current user's
 * Firebase ID token as a Bearer token. The token is refreshed automatically
 * by the Firebase SDK, so we just fetch a fresh one before every request.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import EventEmitter from 'eventemitter3';
import { auth } from './firebase';
import { API_BASE } from './config';

// ── Auth event bus ─────────────────────────────────────────────────────────
export const authEvents    = new EventEmitter();
export const SESSION_EXPIRED = 'SESSION_EXPIRED';

// ── Axios instance ─────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach fresh Firebase ID token ───────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const user = auth.currentUser;
  if (user && config.headers) {
    // forceRefresh=false — Firebase caches and auto-refreshes the token
    const idToken = await user.getIdToken(false);
    config.headers.Authorization = `Bearer ${idToken}`;
  }
  return config;
});

// ── Response interceptor: handle 401 (force-refresh token once) ───────────
api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('No authenticated user');

        // Force a fresh token from Firebase
        const idToken = await user.getIdToken(true);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${idToken}`;
        }
        return api(originalRequest);
      } catch {
        await clearSession();
        authEvents.emit(SESSION_EXPIRED);
      }
    }

    return Promise.reject(error);
  },
);

// ── Session helpers ────────────────────────────────────────────────────────

export type UserProfile = {
  uid:      string;
  username: string;
  role:     'doctor' | 'nurse' | 'admin' | 'patient';
  facility: string;
  email:    string;
};

/** Persist the user profile locally for offline access */
export async function storeSession({ user }: { user: UserProfile }) {
  await SecureStore.setItemAsync('user', JSON.stringify(user));
}

/** Remove local session data (called on logout or session expiry) */
export async function clearSession() {
  await SecureStore.deleteItemAsync('user');
}

/** Read the locally cached user profile */
export async function getStoredUser(): Promise<UserProfile | null> {
  const raw = await SecureStore.getItemAsync('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

// ── Token expiry check (kept for compatibility) ────────────────────────────
export function isTokenExpired(_token: string): boolean {
  // Firebase handles token refresh automatically — always return false here
  // so the app doesn't try to do its own JWT parsing on Firebase tokens.
  return false;
}
