/**
 * SmartCare API client
 *
 * - Axios instance with base URL and auth header injection
 * - Token refresh interceptor (retries once on 401)
 * - Session helpers used across the app
 * - authEvents EventEmitter for broadcasting SESSION_EXPIRED
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import EventEmitter from 'eventemitter3';
import { API_BASE } from './config';

// ── Auth event bus ─────────────────────────────────────────────────────────
export const authEvents = new EventEmitter();
export const SESSION_EXPIRED = 'SESSION_EXPIRED';

// ── Axios instance ─────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach Bearer token ───────────────────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: silent token refresh on 401 ─────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token as string);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${API_BASE}/api/token/refresh`, { refresh: refreshToken });
        const { token, refresh } = res.data;

        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('refresh_token', refresh);

        processQueue(null, token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearSession();
        authEvents.emit(SESSION_EXPIRED);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ── Session helpers ────────────────────────────────────────────────────────

export async function storeSession({
  token,
  refresh,
  user,
}: {
  token: string;
  refresh: string;
  user: object;
}) {
  await Promise.all([
    SecureStore.setItemAsync('token', token),
    SecureStore.setItemAsync('refresh_token', refresh),
    SecureStore.setItemAsync('user', JSON.stringify(user)),
  ]);
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync('token'),
    SecureStore.deleteItemAsync('refresh_token'),
    SecureStore.deleteItemAsync('user'),
  ]);
}

// ── Token expiry check (local, no network) ─────────────────────────────────
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds; give a 30s buffer
    return Date.now() / 1000 > payload.exp - 30;
  } catch {
    // If we can't parse the token, treat it as expired
    return true;
  }
}
