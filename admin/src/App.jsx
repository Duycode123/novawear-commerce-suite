import React, { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import WorkspacePage from "./pages/WorkspacePage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import InventoryPage from "./pages/InventoryPage";
import PurchasesPage from "./pages/PurchasesPage";
import CustomersPage from "./pages/CustomersPage";
import EmployeesPage from "./pages/EmployeesPage";
import AccountsPage from "./pages/AccountsPage";
import SupportInboxPage from "./pages/SupportInboxPage";
import NewsPage from "./pages/NewsPage";
import CouponsPage from "./pages/CouponsPage";
import TasksPage from "./pages/TasksPage";
import ReturnsPage from "./pages/ReturnsPage";
import AuditPage from "./pages/AuditPage";
import SuppliersPage from "./pages/SuppliersPage";

function ProtectedLayout() {
  const { user, bootstrapping } = useAdmin();
  if (bootstrapping) return <main className="ops-login-redirect">Đang xác nhận phiên đăng nhập…</main>;
  if (user?.mustChangePassword) return <RequiredPasswordChange />;
  return user ? <AdminLayout /> : <Navigate to="/login" replace />;
}

function RequiredPasswordChange() {
  const { changePassword, logout } = useAdmin();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setMessage("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await changePassword(form.currentPassword, form.newPassword);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="ops-login-redirect">
      <div className="ops-login-redirect__mark">N</div>
      <p>BẢO MẬT TÀI KHOẢN</p>
      <h1>Đổi mật khẩu trước khi bắt đầu</h1>
      <span>Tài khoản mới đang dùng mật khẩu tạm. Hãy đặt mật khẩu riêng để mở khu vực vận hành.</span>
      <form className="ops-simple-form" onSubmit={submit} style={{ width: "min(480px, 100%)", marginTop: 24 }}>
        <label className="ops-field"><span>Mật khẩu tạm</span><input type="password" required value={form.currentPassword} onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))} /></label>
        <label className="ops-field"><span>Mật khẩu mới</span><input type="password" required minLength={12} maxLength={128} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}" value={form.newPassword} onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))} /><small>Ít nhất 12 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.</small></label>
        <label className="ops-field"><span>Xác nhận mật khẩu mới</span><input type="password" required minLength={12} maxLength={128} value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} /></label>
        {message && <p role="alert">{message}</p>}
        <div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={logout}>Đăng xuất</button><button className="ops-primary-button" type="submit" disabled={saving}>{saving ? "Đang cập nhật…" : "Đổi mật khẩu & tiếp tục"}</button></div>
      </form>
    </main>
  );
}

function AdminOnly({ children }) {
  const { user } = useAdmin();
  return user?.role === "admin" ? children : <Navigate to="/workspace" replace />;
}

function RoleHome() {
  const { user } = useAdmin();
  return user?.role === "admin" ? <DashboardPage /> : <Navigate to="/workspace" replace />;
}

export default function App() {
  return (
    <BrowserRouter basename={process.env.REACT_APP_BASENAME || (process.env.NODE_ENV === "production" ? "/ops" : undefined)}>
      <AdminProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<RoleHome />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/support" element={<SupportInboxPage />} />
            <Route path="/returns" element={<ReturnsPage />} />
            <Route path="/news" element={<AdminOnly><NewsPage /></AdminOnly>} />
            <Route path="/coupons" element={<AdminOnly><CouponsPage /></AdminOnly>} />
            <Route path="/tasks" element={<AdminOnly><TasksPage /></AdminOnly>} />
            <Route path="/audit" element={<AdminOnly><AuditPage /></AdminOnly>} />
            <Route path="/suppliers" element={<AdminOnly><SuppliersPage /></AdminOnly>} />
            <Route path="/employees" element={<AdminOnly><EmployeesPage /></AdminOnly>} />
            <Route path="/accounts" element={<AdminOnly><AccountsPage /></AdminOnly>} />
            <Route path="/Indexhd" element={<Navigate to="/orders" replace />} />
            <Route path="/Indexsp" element={<Navigate to="/products" replace />} />
            <Route path="/Indexdm" element={<Navigate to="/categories" replace />} />
            <Route path="/Indexkhohang" element={<Navigate to="/inventory" replace />} />
            <Route path="/Indexkh" element={<Navigate to="/customers" replace />} />
            <Route path="/Indexnv" element={<Navigate to="/employees" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AdminProvider>
    </BrowserRouter>
  );
}
