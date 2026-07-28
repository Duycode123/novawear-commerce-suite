import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";

export default function LoginPage() {
  const { user, login } = useAdmin();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "staff@novawear.vn", password: "Staff@123" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (role) => {
    setForm(role === "admin"
      ? { email: "admin@novawear.vn", password: "Admin@123" }
      : { email: "staff@novawear.vn", password: "Staff@123" });
  };

  return (
    <div className="ops-login">
      <section className="ops-login__visual">
        <div className="ops-login__brand"><span>N</span><div><strong>NOVA OPS</strong><small>Retail operations</small></div></div>
        <div className="ops-login__art">
          <div className="ops-login__orb" />
          <p>NOVA<br />TEAM</p>
          <div className="ops-login__metric"><span>Đơn hôm nay</span><strong>24</strong><i>+12% ↗</i></div>
          <div className="ops-login__metric ops-login__metric--second"><span>Hiệu suất</span><strong>94%</strong><i>Đúng tiến độ</i></div>
        </div>
        <div className="ops-login__quote"><p>“Một trải nghiệm tốt bắt đầu từ đội ngũ có đủ thông tin để hành động.”</p><span>NOVA operations handbook · 2026</span></div>
      </section>

      <section className="ops-login__panel">
        <form onSubmit={submit}>
          <p className="ops-kicker">STAFF ACCESS</p>
          <h1>Chào mừng<br />trở lại.</h1>
          <p>Đăng nhập để bắt đầu ca làm việc và quản lý cửa hàng.</p>
          {error && <div className="ops-login__error" role="alert">! {error}</div>}
          <label><span>Email công việc</span><input type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="ten@novawear.vn" /></label>
          <label className="ops-password"><span>Mật khẩu</span><input type={showPassword ? "text" : "password"} required value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Ẩn" : "Hiện"}</button></label>
          <button className="ops-primary-button" type="submit" disabled={submitting}>{submitting ? "Đang xác thực..." : "Vào NOVA OPS →"}</button>
          <div className="ops-demo-login">
            <span>Điền nhanh tài khoản mẫu</span>
            <button type="button" onClick={() => fillDemo("staff")}>Nhân viên</button>
            <button type="button" onClick={() => fillDemo("admin")}>Quản trị</button>
          </div>
        </form>
        <p className="ops-login__help">Gặp vấn đề đăng nhập? Liên hệ quản trị hệ thống.</p>
      </section>
    </div>
  );
}
