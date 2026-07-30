import React, { useEffect, useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useShop } from "../context/ShopContext";

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const code = params.get("code");
  const { user, completeOAuth, notify } = useShop();
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (!code || started.current) return;
    started.current = true;
    completeOAuth(code)
      .then(() => {
        notify("Đăng nhập thành công.");
        navigate("/tai-khoan", { replace: true });
      })
      .catch((error) => {
        notify(error.message, "error");
        navigate("/dang-nhap", { replace: true });
      });
  }, [code, completeOAuth, navigate, notify]);

  if (user) return <Navigate to="/tai-khoan" replace />;
  if (!code) return <Navigate to="/dang-nhap" replace />;
  return (
    <main className="oauth-callback">
      <span className="oauth-callback__spinner" aria-hidden="true" />
      <h1>Đang xác nhận đăng nhập</h1>
      <p>Vui lòng giữ nguyên trang này trong giây lát.</p>
    </main>
  );
}
