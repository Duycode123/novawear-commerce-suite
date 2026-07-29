import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BRAND } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Toasts } from "./Ui";
import OpsIcon from "./OpsIcon";

const groups = [
  {
    label: "Tổng quan",
    items: [
      { to: "/", label: "Bảng điều khiển", icon: "home", end: true },
      { to: "/workspace", label: "Không gian nhân viên", icon: "workspace" },
    ],
  },
  {
    label: "Bán hàng",
    items: [
      { to: "/orders", label: "Đơn hàng", icon: "orders" },
      { to: "/customers", label: "Khách hàng", icon: "users" },
      { to: "/support", label: "Hộp thư hỗ trợ", icon: "message" },
      { to: "/returns", label: "Đổi trả & hoàn tiền", icon: "orders" },
      { to: "/coupons", label: "Mã ưu đãi", icon: "product", adminOnly: true },
      { to: "/news", label: "Tin tức website", icon: "message", adminOnly: true },
    ],
  },
  {
    label: "Hàng hóa",
    items: [
      { to: "/products", label: "Sản phẩm", icon: "product" },
      { to: "/categories", label: "Danh mục", icon: "categories" },
      { to: "/inventory", label: "Tồn kho", icon: "inventory" },
      { to: "/purchases", label: "Nhập hàng", icon: "purchase" },
      { to: "/suppliers", label: "Nhà cung cấp", icon: "users", adminOnly: true },
    ],
  },
  {
    label: "Đội ngũ",
    adminOnly: true,
    items: [
      { to: "/employees", label: "Nhân viên", icon: "employees" },
      { to: "/tasks", label: "Phân công công việc", icon: "workspace" },
      { to: "/accounts", label: "Tài khoản", icon: "accounts" },
      { to: "/audit", label: "Nhật ký hệ thống", icon: "inventory" },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

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
          <button type="button" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)}><OpsIcon name="close" /></button>
        </div>
        <nav>
          {groups.filter((group) => !group.adminOnly || user?.role === "admin").map((group) => (
            <div className="ops-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.filter((item) => !item.adminOnly || user?.role === "admin").map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? "is-active" : "")}
                >
                  <span><OpsIcon name={item.icon} /></span>{item.label}<i><OpsIcon name="arrowRight" size={15} /></i>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="ops-sidebar__footer">
          <a href={BRAND.storefrontUrl} target="_blank" rel="noreferrer"><span><OpsIcon name="external" /></span><div><strong>Mở cửa hàng</strong><small>Xem giao diện khách</small></div></a>
          <div className="ops-version">NOVA OPS · v2.0</div>
        </div>
      </aside>

      {sidebarOpen && <button className="ops-sidebar-backdrop" type="button" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />}

      <div className="ops-main">
        <header className="ops-topbar">
          <button className="ops-menu-trigger" type="button" aria-label="Mở menu" onClick={() => setSidebarOpen(true)}><OpsIcon name="menu" /></button>
          <form className="ops-global-search" onSubmit={(event) => { event.preventDefault(); const query = globalSearch.trim(); navigate(query ? `/orders?search=${encodeURIComponent(query)}` : "/orders"); }}>
            <OpsIcon name="search" size={17} />
            <input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Tìm đơn hàng, sản phẩm, khách hàng..." aria-label="Tìm kiếm toàn hệ thống" />
            <kbd>⌘ K</kbd>
          </form>
          <div className="ops-topbar__actions">
            <div className="ops-topbar__date"><strong>Hôm nay</strong><span>{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date())}</span></div>
            <button type="button" aria-label="Thông báo" className="ops-notification"><OpsIcon name="bell" /><span>3</span></button>
            <button type="button" className="ops-profile-trigger" onClick={() => setProfileOpen((value) => !value)}>
              <span>{user?.name?.charAt(0)}</span>
              <div><strong>{user?.name}</strong><small>{user?.role === "admin" ? "Quản trị viên" : "Nhân viên"}</small></div>
              <b><OpsIcon name="chevronDown" size={15} /></b>
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
