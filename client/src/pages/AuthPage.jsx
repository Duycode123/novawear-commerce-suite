import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";

export default function AuthPage({ mode = "login" }) {
  const isLogin = mode === "login";
  const { user, login, register, notify } = useShop();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (user) return <Navigate to="/tai-khoan" replace />;

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!isLogin && form.password !== form.confirmPassword) {
      notify("Mật khẩu xác nhận chưa khớp.", "error");
      return;
    }
    setSubmitting(true);
    try {
      if (isLogin) await login({ email: form.email, password: form.password });
      else await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      notify(isLogin ? "Chào mừng bạn quay lại." : "Tài khoản đã được tạo.");
      navigate(location.state?.from || "/tai-khoan", { replace: true });
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <img src="/Images/about-us-model.webp" alt="" />
        <div className="auth-visual__copy">
          <p className="eyebrow">NOVA PEOPLE</p>
          <h2>Mặc điều bạn tin.<br />Sống theo nhịp của bạn.</h2>
          <p>Thành viên được theo dõi đơn, lưu món yêu thích và nhận ưu đãi riêng.</p>
        </div>
      </div>
      <section className="auth-panel">
        <div className="auth-panel__top"><Link to="/">← Trang chủ</Link><span>NOVAWEAR</span></div>
        <div className="auth-form-wrap">
          <p className="eyebrow">{isLogin ? "Welcome back" : "Join the club"}</p>
          <h1>{isLogin ? "Đăng nhập" : "Tạo tài khoản"}</h1>
          <p>{isLogin ? "Tiếp tục hành trình cùng NOVAWEAR." : "Chỉ mất một phút để bắt đầu."}</p>
          <form className="auth-form" onSubmit={submit}>
            {!isLogin && (
              <>
                <label className="field"><span>Họ và tên</span><input name="name" required minLength={2} value={form.name} onChange={change} placeholder="Tên của bạn" /></label>
                <label className="field"><span>Số điện thoại</span><input name="phone" required pattern="[0-9+\s.-]{9,15}" value={form.phone} onChange={change} placeholder="090 123 4567" /></label>
              </>
            )}
            <label className="field"><span>Email</span><input name="email" type="email" required value={form.email} onChange={change} placeholder="ban@email.com" /></label>
            <label className="field password-field">
              <span>Mật khẩu</span>
              <input name="password" type={showPassword ? "text" : "password"} required minLength={8} value={form.password} onChange={change} placeholder="Ít nhất 8 ký tự, gồm chữ và số" />
              <button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Ẩn" : "Hiện"}</button>
            </label>
            {!isLogin && <label className="field"><span>Xác nhận mật khẩu</span><input name="confirmPassword" type="password" required minLength={8} value={form.confirmPassword} onChange={change} placeholder="Nhập lại mật khẩu" /></label>}
            {isLogin && <div className="auth-options"><label><input type="checkbox" /> Ghi nhớ đăng nhập</label><button type="button" onClick={() => notify("Vui lòng liên hệ CSKH để đặt lại mật khẩu.", "info")}>Quên mật khẩu?</button></div>}
            <button className="button button--dark button--wide" type="submit" disabled={submitting}>{submitting ? "Đang xử lý..." : isLogin ? "Đăng nhập →" : "Tạo tài khoản →"}</button>
          </form>
          {isLogin && (
            <div className="demo-account">
              <strong>Tài khoản trải nghiệm</strong>
              <span>demo@novawear.vn</span>
              <span>Demo@123</span>
            </div>
          )}
          <p className="auth-switch">
            {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
            <Link to={isLogin ? "/dang-ky" : "/dang-nhap"}>{isLogin ? "Đăng ký ngay" : "Đăng nhập"}</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
