import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const ShopContext = createContext(null);

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
}

export function ShopProvider({ children }) {
  const [cart, setCart] = useState(() => readStorage("novawear_cart", []));
  const [wishlist, setWishlist] = useState(() => readStorage("novawear_wishlist", []));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("novawear_user")) || null;
    } catch (_error) {
      return null;
    }
  });
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    localStorage.setItem("novawear_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("novawear_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener("novawear:session-expired", expire);
    return () => window.removeEventListener("novawear:session-expired", expire);
  }, []);

  const notify = useCallback((message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const addToCart = useCallback((product, options = {}) => {
    const size = options.size || product.sizes?.[0] || "";
    const color = options.color || product.colors?.[0] || "";
    const quantity = Math.max(1, Number(options.quantity || 1));
    const key = `${product.id}-${size}-${color}`;

    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) => (
          item.key === key
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock || 99) }
            : item
        ));
      }
      return [
        ...current,
        {
          key,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          sku: product.sku,
          image: product.image,
          price: product.price,
          stock: product.stock,
          size,
          color,
          quantity: Math.min(quantity, product.stock || 99),
        },
      ];
    });
    notify(`Đã thêm ${product.name} vào giỏ.`);
  }, [notify]);

  const updateCart = useCallback((key, quantity) => {
    setCart((current) => current.map((item) => (
      item.key === key
        ? { ...item, quantity: Math.max(1, Math.min(Number(quantity), item.stock || 99)) }
        : item
    )));
  }, []);

  const removeFromCart = useCallback((key) => {
    setCart((current) => current.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback((product) => {
    setWishlist((current) => {
      const exists = current.some((item) => item.id === product.id);
      if (exists) {
        notify("Đã bỏ khỏi danh sách yêu thích.", "info");
        return current.filter((item) => item.id !== product.id);
      }
      notify("Đã lưu vào danh sách yêu thích.");
      return [...current, {
        id: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        price: product.price,
        comparePrice: product.comparePrice,
        stock: product.stock,
        sizes: product.sizes,
        colors: product.colors,
      }];
    });
  }, [notify]);

  const login = useCallback(async (credentials) => {
    const result = await api.post("/auth/login", credentials);
    if (result.user.role === "customer") {
      sessionStorage.setItem("novawear_token", result.token);
      sessionStorage.setItem("novawear_user", JSON.stringify(result.user));
      setUser(result.user);
    } else {
      sessionStorage.removeItem("novawear_token");
      sessionStorage.removeItem("novawear_user");
      setUser(null);
    }
    return result;
  }, []);

  const register = useCallback(async (details) => {
    const result = await api.post("/auth/register", details);
    if (result.token && result.user) {
      sessionStorage.setItem("novawear_token", result.token);
      sessionStorage.setItem("novawear_user", JSON.stringify(result.user));
      setUser(result.user);
    }
    return result;
  }, []);

  const verifyAccount = useCallback(async (details) => {
    const result = await api.post("/auth/verify", details);
    sessionStorage.setItem("novawear_token", result.token);
    sessionStorage.setItem("novawear_user", JSON.stringify(result.user));
    setUser(result.user);
    return result;
  }, []);

  const resendVerification = useCallback(async (email) => {
    return api.post("/auth/resend-verification", { email });
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("novawear_token");
    sessionStorage.removeItem("novawear_user");
    setUser(null);
    notify("Bạn đã đăng xuất.", "info");
  }, [notify]);

  const updateLocalUser = useCallback((updates) => {
    setUser((current) => {
      const next = { ...current, ...updates };
      sessionStorage.setItem("novawear_user", JSON.stringify(next));
      return next;
    });
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const value = useMemo(() => ({
    cart,
    cartCount,
    cartSubtotal,
    wishlist,
    user,
    toasts,
    notify,
    removeToast,
    addToCart,
    updateCart,
    removeFromCart,
    clearCart,
    toggleWishlist,
    login,
    register,
    verifyAccount,
    resendVerification,
    logout,
    updateLocalUser,
  }), [
    cart,
    cartCount,
    cartSubtotal,
    wishlist,
    user,
    toasts,
    notify,
    removeToast,
    addToCart,
    updateCart,
    removeFromCart,
    clearCart,
    toggleWishlist,
    login,
    register,
    verifyAccount,
    resendVerification,
    logout,
    updateLocalUser,
  ]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error("useShop must be used inside ShopProvider");
  return context;
}
