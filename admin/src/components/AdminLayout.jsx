import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BRAND } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Toasts } from "./Ui";

const groups = [
  {
    label: "Tổng quan",
    items: [
      { to: "/", label: "Bảng điều khiển", icon: "⌂", end: true },
      { to: "/workspace", label: "Không gian nhân viên", icon: "◫" },
    ],
  },
  {
    label: "Bán hàng",
    items: [
      { to: "/orders", label: "Đơn hàng", icon: "▢" },
      { to: "/customers", label: "Khách hàng", icon: "○" },
      { to: "/support", label: "Hộp thư hỗ trợ", icon: "?" },
    ],
  },
  {
    label: "Hàng hóa",
    items: [
      { to: "/products", label: "Sản phẩm", icon: "◇" },
      { to: "/categories", label: "Danh mục", icon: "⌗" },
      { to: "/inventory", label: "Tồn kho", icon: "▤" },
      { to: "/purchases", label: "Nhập hàng", icon: "↧" },
    ],
  },
  {
    label: "Đội ngũ",
    adminOnly: true,
    items: [
      { to: "/employees", label: "Nhân viên", icon: "◎" },
      { to: "/accounts", label: "Tài khoản", icon: "⌾" },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div className="ops-shell">
      <aside className={`ops-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="ops-brand">
          <span>N</span>
          <div><strong>{BRAND.portal}</strong><small>Retail operations</small></div>
          <button type="button" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)}>×</button>
        </div>
        <nav>
          {groups.filter((group) => !group.adminOnly || user?.role === "admin").map((group) => (
            <div className="ops-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? "is-active" : "")}
                >
                  <span>{item.icon}</span>{item.label}<i>→</i>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="ops-sidebar__footer">
          <a href={BRAND.storefrontUrl} target="_blank" rel="noreferrer"><span>↗</span><div><strong>Mở cửa hàng</strong><small>Xem giao diện khách</small></div></a>
          <div className="ops-version">NOVA OPS · v2.0</div>
        </div>
      </aside>

      {sidebarOpen && <button className="ops-sidebar-backdrop" type="button" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />}

      <div className="ops-main">
        <header className="ops-topbar">
          <button className="ops-menu-trigger" type="button" aria-label="Mở menu" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="ops-topbar__date">
            <strong>{new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(new Date())}</strong>
            <span>{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "long", year: "numeric" }).format(new Date())}</span>
          </div>
          <div className="ops-topbar__actions">
            <button type="button" aria-label="Thông báo" className="ops-notification">○<span>3</span></button>
            <button type="button" className="ops-profile-trigger" onClick={() => setProfileOpen((value) => !value)}>
              <span>{user?.name?.charAt(0)}</span>
              <div><strong>{user?.name}</strong><small>{user?.role === "admin" ? "Quản trị viên" : "Nhân viên"}</small></div>
              <b>⌄</b>
            </button>
            {profileOpen && (
              <div className="ops-profile-menu">
                <NavLink to="/workspace">Hồ sơ & ca làm việc</NavLink>
                <button type="button" onClick={logout}>Đăng xuất</button>
              </div>
            )}
          </div>
        </header>
        <main className="ops-content">
          <Outlet />
        </main>
      </div>
      <Toasts />
    </div>
  );
}
