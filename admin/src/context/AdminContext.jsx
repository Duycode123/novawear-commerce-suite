import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const AdminContext = createContext(null);

function readUser() {
  try {
    return JSON.parse(sessionStorage.getItem("nova_ops_user")) || null;
  } catch (_error) {
    return null;
  }
}

export function AdminProvider({ children }) {
  const [user, setUser] = useState(readUser);
  const [bootstrapping, setBootstrapping] = useState(() => window.location.hash.includes("code="));
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener("nova:ops-session-expired", expire);
    return () => window.removeEventListener("nova:ops-session-expired", expire);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = params.get("code");
    if (!code) {
      setBootstrapping(false);
      return;
    }
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    api.post("/auth/operations-exchange", { code })
      .then((result) => {
        sessionStorage.setItem("nova_ops_token", result.token);
        sessionStorage.setItem("nova_ops_user", JSON.stringify(result.user));
        setUser(result.user);
      })
      .catch(() => {
        sessionStorage.removeItem("nova_ops_token");
        sessionStorage.removeItem("nova_ops_user");
        setUser(null);
      })
      .finally(() => setBootstrapping(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get("/auth/me")
      .then((result) => {
        if (!["admin", "staff"].includes(result.user?.role)) logout();
      })
      .catch(() => logout());
  // Validate only when a new session is accepted.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const notify = useCallback((message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await api.post("/auth/login", { email, password, portal: "admin" });
    const exchanged = await api.post("/auth/operations-exchange", {
      code: result.operationsHandoffCode,
    });
    sessionStorage.setItem("nova_ops_token", exchanged.token);
    sessionStorage.setItem("nova_ops_user", JSON.stringify(exchanged.user));
    setUser(exchanged.user);
    return exchanged.user;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("nova_ops_token");
    sessionStorage.removeItem("nova_ops_user");
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    bootstrapping,
    toasts,
    login,
    logout,
    notify,
    removeToast: (id) => setToasts((current) => current.filter((toast) => toast.id !== id)),
  }), [user, bootstrapping, toasts, login, logout, notify]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used inside AdminProvider");
  return context;
}
