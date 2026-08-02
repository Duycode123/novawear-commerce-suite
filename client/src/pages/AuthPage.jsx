import React, { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { ApiError, api, API_BASE } from "../services/api";

export default function AuthPage({ mode = "login" }) {
  const isLogin = mode === "login";
  const { user, login, register, verifyAccount, resendVerification, notify } = useShop();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [verification, setVerification] = useState(null);
  const [passwordReset, setPasswordReset] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauth, setOauth] = useState({ google: false, facebook: false });
  const navigate = useNavigate();
  const location = useLocation();
  const operationsUrl = process.env.REACT_APP_OPS_URL
    || (window.location.hostname === "localhost" ? "http://localhost:3001" : "/ops");

  useEffect(() => {
    api.get("/auth/oauth/config")
      .then((result) => setOauth(result.data || {}))
      .catch(() => setOauth({ google: false, facebook: false }));
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get("oauthError");
    const verifyEmail = params.get("verifyEmail");
    if (verifyEmail) {
      setVerification({ email: verifyEmail, code: "", demoCode: "" });
      notify("Hãy nhập mã đã gửi tới email để hoàn tất đăng nhập liên kết.", "info");
    }
    if (errorCode) notify("Không thể đăng nhập bằng tài khoản liên kết. Vui lòng thử lại.", "error");
  }, [notify]);

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
      if (isLogin) {
        const result = await login({ email: form.email, password: form.password });
        if (["admin", "staff"].includes(result.user.role)) {
          if (!result.operationsHandoffCode) {
            throw new ApiError("Không tạo được phiên chuyển tới khu vực vận hành. Vui lòng thử lại.", 502, {
              code: "OPERATIONS_HANDOFF_MISSING",
            });
          }
          const handoff = new URLSearchParams({
            code: result.operationsHandoffCode,
          });
          window.location.replace(`${operationsUrl}/login#${handoff.toString()}`);
          return;
        }
        notify("Chào mừng bạn quay lại.");
      } else {
        const result = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
        if (result.requiresVerification) {
          setVerification({
            email: result.email,
            code: "",
            demoCode: result.verificationCode || "",
          });
          notify(result.message, "info");
          return;
        }
        notify("Tài khoản đã được tạo.");
      }
      navigate(location.state?.from || "/tai-khoan", { replace: true });
    } catch (requestError) {
      if (requestError.details?.code === "ACCOUNT_NOT_VERIFIED") {
        setVerification({
          email: requestError.details.email || form.email,
          code: "",
          demoCode: "",
        });
      }
      notify(requestError.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const submitVerification = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await verifyAccount({
        email: verification.email,
        code: verification.code,
      });
      notify(result.message);
      navigate(location.state?.from || "/tai-khoan", { replace: true });
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setSubmitting(true);
    try {
      const result = await resendVerification(verification.email);
      setVerification((current) => ({
        ...current,
        code: "",
        demoCode: result.verificationCode || "",
      }));
      notify(result.message, "info");
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const requestPasswordReset = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await api.post("/auth/password-reset/request", { email: passwordReset.email });
      setPasswordReset((current) => ({ ...current, stage: "confirm", code: "", newPassword: "", confirmPassword: "" }));
      notify(result.message, "info");
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmPasswordReset = async (event) => {
    event.preventDefault();
    if (passwordReset.newPassword !== passwordReset.confirmPassword) {
      notify("Mật khẩu xác nhận chưa khớp.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.post("/auth/password-reset/confirm", {
        email: passwordReset.email,
        code: passwordReset.code,
        newPassword: passwordReset.newPassword,
      });
      setForm((current) => ({ ...current, email: passwordReset.email, password: "" }));
      setPasswordReset(null);
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`auth-page auth-page--${isLogin ? "login" : "register"}`}>
      <div className="auth-visual">
        <img src="/Images/nova-v3/auth-couple.png" alt="Phong cách thành viên NOVAWEAR" />
        <div className="auth-visual__copy">
          <p className="eyebrow">NOVA PEOPLE</p>
          <h2>Mặc điều bạn tin.<br />Sống theo nhịp của bạn.</h2>
          <p>Thành viên được theo dõi đơn, lưu món yêu thích và nhận ưu đãi riêng.</p>
        </div>
      </div>
      <section className="auth-panel">
        <div className="auth-panel__top"><Link to="/">← Trang chủ</Link><span>NOVAWEAR</span></div>
        <div className="auth-form-wrap">
          {(!isLogin || verification) && (
            <ol className="auth-progress" aria-label="Tiến trình đăng ký">
              <li className={!verification ? "is-active" : "is-done"}><span>1</span>Thông tin</li>
              <li className={verification ? "is-active" : ""}><span>2</span>Xác thực</li>
              <li><span>3</span>Hoàn tất</li>
            </ol>
          )}
          <p className="eyebrow">{verification ? "Verify your account" : passwordReset ? "Recover your account" : isLogin ? "Welcome back" : "Join the club"}</p>
          <h1>{verification ? "Xác minh tài khoản" : passwordReset ? "Đặt lại mật khẩu" : isLogin ? "Đăng nhập" : "Tạo tài khoản"}</h1>
          {(verification || passwordReset) && (
            <p>
              {verification
                ? <>Nhập mã 6 số dành cho <strong>{verification.email}</strong>. Mã có hiệu lực trong 10 phút.</>
                : passwordReset.stage === "confirm"
                  ? <>Nhập mã 6 số đã gửi tới <strong>{passwordReset.email}</strong> và chọn mật khẩu mới.</>
                  : "Nhập email tài khoản để nhận mã đặt lại mật khẩu."}
            </p>
          )}
          {verification ? (
            <form className="auth-form auth-verification" onSubmit={submitVerification}>
              <label className="field">
                <span>Mã xác minh</span>
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  value={verification.code}
                  onChange={(event) => setVerification((current) => ({
                    ...current,
                    code: event.target.value.replace(/\D/g, "").slice(0, 6),
                  }))}
                  placeholder="000000"
                />
              </label>
              {verification.demoCode && (
                <p className="auth-verification__demo">
                  Mã xác minh dùng khi chạy local: <strong>{verification.demoCode}</strong>
                </p>
              )}
              <button className="button button--dark button--wide" type="submit" disabled={submitting || verification.code.length !== 6}>
                {submitting ? "Đang xác minh..." : "Xác minh & đăng nhập →"}
              </button>
              <div className="auth-verification__actions">
                <button type="button" onClick={resendCode} disabled={submitting}>Gửi lại mã</button>
                <button type="button" onClick={() => setVerification(null)}>Đổi email</button>
              </div>
            </form>
          ) : passwordReset ? (
            passwordReset.stage === "confirm" ? (
              <form className="auth-form auth-verification" onSubmit={confirmPasswordReset}>
                <label className="field"><span>Mã xác minh</span><input autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" required value={passwordReset.code} onChange={(event) => setPasswordReset((current) => ({ ...current, code: event.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="000000" /></label>
                <label className="field"><span>Mật khẩu mới</span><input type="password" minLength={10} maxLength={128} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}" required value={passwordReset.newPassword} onChange={(event) => setPasswordReset((current) => ({ ...current, newPassword: event.target.value }))} placeholder="Tối thiểu 10 ký tự, có chữ hoa, chữ thường và số" /></label>
                <label className="field"><span>Xác nhận mật khẩu mới</span><input type="password" minLength={10} maxLength={128} required value={passwordReset.confirmPassword} onChange={(event) => setPasswordReset((current) => ({ ...current, confirmPassword: event.target.value }))} /></label>
                <button className="button button--dark button--wide" type="submit" disabled={submitting || passwordReset.code.length !== 6}>{submitting ? "Đang cập nhật..." : "Đặt lại mật khẩu →"}</button>
                <div className="auth-verification__actions"><button type="button" onClick={() => setPasswordReset((current) => ({ ...current, stage: "request" }))}>Đổi email</button><button type="button" onClick={() => setPasswordReset(null)}>Quay lại đăng nhập</button></div>
              </form>
            ) : (
              <form className="auth-form" onSubmit={requestPasswordReset}>
                <label className="field"><span>Email</span><input type="email" required value={passwordReset.email} onChange={(event) => setPasswordReset((current) => ({ ...current, email: event.target.value }))} placeholder="ban@email.com" /></label>
                <button className="button button--dark button--wide" type="submit" disabled={submitting}>{submitting ? "Đang gửi..." : "Gửi mã xác minh →"}</button>
                <div className="auth-verification__actions"><button type="button" onClick={() => setPasswordReset(null)}>Quay lại đăng nhập</button></div>
              </form>
            )
          ) : (
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
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={isLogin ? 1 : 10}
                  maxLength={128}
                  pattern={isLogin ? undefined : "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{10,128}"}
                  value={form.password}
                  onChange={change}
                  placeholder={isLogin ? "Nhập mật khẩu" : "Tối thiểu 10 ký tự, có chữ hoa, chữ thường và số"}
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Ẩn" : "Hiện"}</button>
              </label>
              {!isLogin && <label className="field"><span>Xác nhận mật khẩu</span><input name="confirmPassword" type="password" required minLength={10} maxLength={128} value={form.confirmPassword} onChange={change} placeholder="Nhập lại mật khẩu" /></label>}
              {isLogin && <div className="auth-options"><button type="button" onClick={() => setPasswordReset({ stage: "request", email: form.email })}>Quên mật khẩu?</button></div>}
              <button className="button button--dark button--wide" type="submit" disabled={submitting}>{submitting ? "Đang xử lý..." : isLogin ? "Đăng nhập →" : "Tạo tài khoản →"}</button>
            </form>
          )}
          {isLogin && !verification && !passwordReset && (oauth.google || oauth.facebook) && (
            <div className="auth-social">
              <span>hoặc</span>
              {oauth.google && <button type="button" onClick={() => window.location.assign(`${API_BASE}/auth/oauth/google/start`)}><b>G</b> Đăng nhập với Google</button>}
              {oauth.facebook && <button type="button" onClick={() => window.location.assign(`${API_BASE}/auth/oauth/facebook/start`)}><b>f</b> Đăng nhập với Facebook</button>}
            </div>
          )}
          {isLogin && !verification && !passwordReset && process.env.NODE_ENV !== "production" && (
            <div className="demo-account">
              <strong>Tài khoản trải nghiệm</strong>
              <span>Khách: demo@novawear.vn / Demo@123</span>
              <span>Nhân viên: staff@novawear.vn / Staff@123</span>
              <span>Quản trị: admin@novawear.vn / Admin@123</span>
            </div>
          )}
          {!verification && !passwordReset && <p className="auth-switch">
            {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
            <Link to={isLogin ? "/dang-ky" : "/dang-nhap"}>{isLogin ? "Đăng ký ngay" : "Đăng nhập"}</Link>
          </p>}
        </div>
      </section>
    </div>
  );
}
