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
      <section className="ops-login__panel">
        <div className="ops-login__brand"><span>N</span><div><strong>NOVAWEAR</strong><small>Operations center</small></div></div>
        <div className="ops-login__intro"><h1>Nền tảng vận hành<br />thương mại điện tử.</h1><p>Dành riêng cho đội ngũ nội bộ.</p></div>
        <form onSubmit={submit}>
          <h2>Đăng nhập quản trị</h2>
          <p>Vui lòng đăng nhập để tiếp tục.</p>
          {error && <div className="ops-login__error" role="alert">! {error}</div>}
          <label><span>Email công việc</span><input type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="ten@novawear.vn" /></label>
          <label className="ops-password"><span>Mật khẩu</span><input type={showPassword ? "text" : "password"} required value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Ẩn" : "Hiện"}</button></label>
          <label className="ops-remember"><input type="checkbox" defaultChecked /> Ghi nhớ thiết bị này <button type="button">Quên mật khẩu?</button></label>
          <button className="ops-primary-button" type="submit" disabled={submitting}>{submitting ? "Đang xác thực..." : "Đăng nhập"}</button>
          <div className="ops-demo-login">
            <span>Tài khoản trải nghiệm</span>
            <button type="button" onClick={() => fillDemo("staff")}>Nhân viên</button>
            <button type="button" onClick={() => fillDemo("admin")}>Quản trị</button>
          </div>
        </form>
        <p className="ops-login__help">◇ Kết nối được mã hóa và bảo vệ · Cần hỗ trợ? Liên hệ IT Helpdesk.</p>
      </section>

      <section className="ops-login__visual">
        <img src={`${process.env.PUBLIC_URL}/images/nova-v3/admin-login.png`} alt="Đội ngũ vận hành NOVAWEAR" />
        <div className="ops-login__visual-caption"><span>NOVAWEAR SS’26 OPERATIONS</span><strong>Minimal. Modern. Yours.</strong></div>
      </section>
    </div>
  );
}
