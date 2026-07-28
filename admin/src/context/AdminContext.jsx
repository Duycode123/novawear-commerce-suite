import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const AdminContext = createContext(null);

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("nova_ops_user")) || null;
  } catch (_error) {
    return null;
  }
}

export function AdminProvider({ children }) {
  const [user, setUser] = useState(readUser);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener("nova:ops-session-expired", expire);
    return () => window.removeEventListener("nova:ops-session-expired", expire);
  }, []);

  const notify = useCallback((message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await api.post("/auth/login", { email, password, portal: "admin" });
    localStorage.setItem("nova_ops_token", result.token);
    localStorage.setItem("nova_ops_user", JSON.stringify(result.user));
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("nova_ops_token");
    localStorage.removeItem("nova_ops_user");
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    toasts,
    login,
    logout,
    notify,
    removeToast: (id) => setToasts((current) => current.filter((toast) => toast.id !== id)),
  }), [user, toasts, login, logout, notify]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used inside AdminProvider");
  return context;
}
