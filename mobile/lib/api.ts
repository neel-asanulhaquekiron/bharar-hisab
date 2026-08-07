import axios, { AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const STORE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  user: "user",
} as const;

export const api = axios.create({ baseURL: API_URL, timeout: 15_000 });

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Auth provider registers a callback to log the user out when refresh fails. */
export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(STORE_KEYS.refreshToken);
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    await SecureStore.setItemAsync(STORE_KEYS.accessToken, data.accessToken);
    await SecureStore.setItemAsync(STORE_KEYS.refreshToken, data.refreshToken);
    setAccessToken(data.accessToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
  const isAuthCall = original?.url?.includes("/auth/");
  if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
    refreshing ??= refreshAccessToken().finally(() => (refreshing = null));
    const token = await refreshing;
    if (token) {
      original._retried = true;
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    }
    onUnauthorized?.();
  }
  throw error;
});

/** Bangla message from the API if present, otherwise a generic one. */
export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (!error.response) return "সার্ভারের সাথে সংযোগ করা যাচ্ছে না";
  }
  return "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন";
}
