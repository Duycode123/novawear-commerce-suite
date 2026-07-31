import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";

export default function LoginPage() {
  const { user, bootstrapping } = useAdmin();
  const storefrontUrl = process.env.REACT_APP_STOREFRONT_URL
    || (window.location.hostname === "localhost" ? "http://localhost:3000" : "/");

  useEffect(() => {
    if (!user && !bootstrapping) {
      window.location.replace(`${storefrontUrl.replace(/\/$/, "")}/dang-nhap?from=operations`);
    }
  }, [storefrontUrl, user, bootstrapping]);

  if (user) return <Navigate to={user.role === "admin" ? "/" : "/workspace"} replace />;

  return (
    <main className="ops-login-redirect" aria-live="polite">
      <div className="ops-login-redirect__mark">N</div>
      <p>NOVAWEAR ID</p>
      <h1>Đang mở cổng đăng nhập chung…</h1>
    </main>
  );
}
