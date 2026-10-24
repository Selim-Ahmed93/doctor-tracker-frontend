"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, ApiError, getErrorMessage } from "@/lib/api";

const AuthContext = createContext(null);

/**
 * Session state for the admin console.
 *
 * The JWT lives in an httpOnly cookie, so the only way to know whether a
 * session exists is to ask the API. `status` therefore starts as "loading" and
 * becomes one of: "authenticated", "unauthenticated", "error".
 */
export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const startedRef = useRef(false);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const { data } = await api.get("/auth/me");
      setAdmin(data);
      setStatus("authenticated");
    } catch (requestError) {
      setAdmin(null);

      if (requestError instanceof ApiError && requestError.isUnauthorized) {
        setStatus("unauthenticated");
        return;
      }

      setStatus("error");
      setError(getErrorMessage(requestError));
    }
  }, []);

  useEffect(() => {
    // React Strict Mode mounts effects twice in development; one session check
    // per page load is enough.
    if (startedRef.current) return;
    startedRef.current = true;
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setAdmin(data);
    setStatus("authenticated");
    setError(null);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      // Even if the request fails, the UI should stop showing private data.
      setAdmin(null);
      setStatus("unauthenticated");
      setError(null);
    }
  }, []);

  const value = useMemo(
    () => ({ admin, status, error, login, logout, refresh }),
    [admin, status, error, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }

  return context;
}
