import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  const handoffCodeRef = useRef(new URLSearchParams(window.location.hash.replace(/^#/, "")).get("code"));
  const handoffStartedRef = useRef(false);
  const [user, setUser] = useState(() => (handoffCodeRef.current ? null : readUser()));
  const [bootstrapping, setBootstrapping] = useState(() => Boolean(handoffCodeRef.current));
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener("nova:ops-session-expired", expire);
    return () => window.removeEventListener("nova:ops-session-expired", expire);
  }, []);

  useEffect(() => {
    const code = handoffCodeRef.current;
    if (!code) {
      setBootstrapping(false);
      return;
    }
    // React StrictMode runs mount effects twice in development. Keep the
    // one-time handoff alive instead of letting the second pass redirect the
    // operator back to the storefront while the exchange is still pending.
    if (handoffStartedRef.current) return;
    handoffStartedRef.current = true;
    sessionStorage.removeItem("nova_ops_token");
    sessionStorage.removeItem("nova_ops_user");
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

  const logout = useCallback(async () => {
    try {
      if (sessionStorage.getItem("nova_ops_token")) await api.post("/auth/logout", {});
    } catch (_error) {
      // Always clear the local session, even if the API is unavailable.
    } finally {
      sessionStorage.removeItem("nova_ops_token");
      sessionStorage.removeItem("nova_ops_user");
      setUser(null);
      setNotifications([]);
      setNotificationUnreadCount(0);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const result = await api.put("/auth/password", { currentPassword, newPassword });
    if (result.token) sessionStorage.setItem("nova_ops_token", result.token);
    if (result.user) {
      sessionStorage.setItem("nova_ops_user", JSON.stringify(result.user));
      setUser(result.user);
    }
    return result;
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const result = await api.get("/notifications?limit=30");
      setNotifications(result.data || []);
      setNotificationUnreadCount(Number(result.unreadCount || 0));
    } catch (_error) {
      // Session errors are handled centrally by the API service.
    }
  }, [user]);

  const markNotificationRead = useCallback(async (id) => {
    await api.patch(`/notifications/${id}/read`, {});
    setNotifications((current) => current.map((item) => (
      item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item
    )));
    setNotificationUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await api.patch("/notifications/read-all", {});
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
    setNotificationUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 15000);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") loadNotifications(); };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [user, loadNotifications]);

  const value = useMemo(() => ({
    user,
    bootstrapping,
    toasts,
    login,
    logout,
    notify,
    changePassword,
    notifications,
    notificationUnreadCount,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    removeToast: (id) => setToasts((current) => current.filter((toast) => toast.id !== id)),
  }), [
    user, bootstrapping, toasts, login, logout, notify, changePassword, notifications,
    notificationUnreadCount, loadNotifications, markNotificationRead, markAllNotificationsRead,
  ]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used inside AdminProvider");
  return context;
}
