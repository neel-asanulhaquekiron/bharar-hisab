import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api, setAccessToken, setOnUnauthorized, STORE_KEYS } from "./api";
import type { User } from "./types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function persistSession(user: User, accessToken: string, refreshToken: string) {
  setAccessToken(accessToken);
  await SecureStore.setItemAsync(STORE_KEYS.accessToken, accessToken);
  await SecureStore.setItemAsync(STORE_KEYS.refreshToken, refreshToken);
  await SecureStore.setItemAsync(STORE_KEYS.user, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          SecureStore.getItemAsync(STORE_KEYS.accessToken),
          SecureStore.getItemAsync(STORE_KEYS.user),
        ]);
        if (token && storedUser) {
          setAccessToken(token);
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const logout = async () => {
      setAccessToken(null);
      setUser(null);
      await Promise.all(
        Object.values(STORE_KEYS).map((key) => SecureStore.deleteItemAsync(key)),
      );
    };
    return {
      user,
      loading,
      login: async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        await persistSession(data.user, data.accessToken, data.refreshToken);
        setUser(data.user);
      },
      register: async (name, email, password) => {
        const { data } = await api.post("/auth/register", { name, email, password });
        await persistSession(data.user, data.accessToken, data.refreshToken);
        setUser(data.user);
      },
      logout,
    };
  }, [user, loading]);

  useEffect(() => {
    setOnUnauthorized(() => void value.logout());
    return () => setOnUnauthorized(null);
  }, [value]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
