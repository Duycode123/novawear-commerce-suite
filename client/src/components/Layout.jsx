import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { SITE } from "../config/site";
import { useShop } from "../context/ShopContext";
import { Logo, ToastViewport } from "./Common";
import Icon from "./Icon";

const navItems = [
  { to: "/cua-hang", label: "Cửa hàng" },
  { to: "/cua-hang?category=ao-thun", label: "Áo" },
  { to: "/cua-hang?category=quan-dai", label: "Quần" },
  { to: "/ve-chung-toi", label: "Câu chuyện" },
  { to: "/chon-size", label: "Chọn size" },
];

export default function Layout() {
  const { cartCount, wishlist, user, logout } = useShop();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setMobileOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  const submitSearch = (event) => {
    event.preventDefault();
    const term = search.trim();
    navigate(term ? `/cua-hang?search=${encodeURIComponent(term)}` : "/cua-hang");
  };

  return (
    <div className="site-shell">
      <div className="announcement">
        <p>Miễn phí giao hàng từ 699K</p>
        <span aria-hidden="true">•</span>
        <p>Đổi size miễn phí trong 30 ngày</p>
        <Link to="/ho-tro">Cần hỗ trợ?</Link>
      </div>

      <header className="site-header">
        <div className="site-header__inner">
          <button
            className="header-icon header-menu-button"
            type="button"
            aria-label="Mở menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          >
            <Icon name={mobileOpen ? "close" : "menu"} size={23} />
          </button>
          <Logo />
          <nav className="desktop-nav" aria-label="Điều hướng chính">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? "is-active" : "")}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="header-action header-action--search"
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              aria-expanded={searchOpen}
            >
              <span aria-hidden="true"><Icon name="search" /></span><span className="header-action__label">Tìm kiếm</span>
            </button>
            <Link className="header-action" to="/yeu-thich">
              <span aria-hidden="true"><Icon name="heart" /></span><span className="header-action__label">Đã lưu</span>
              {wishlist.length > 0 && <b>{wishlist.length}</b>}
            </Link>
            <Link className="header-action" to={user ? "/tai-khoan" : "/dang-nhap"}>
              <span aria-hidden="true"><Icon name="user" /></span><span className="header-action__label">{user ? user.name.split(" ").slice(-1)[0] : "Tài khoản"}</span>
            </Link>
            <Link className="header-action" to="/gio-hang">
              <span aria-hidden="true"><Icon name="bag" /></span><span className="header-action__label">Giỏ hàng</span>
              {cartCount > 0 && <b>{cartCount}</b>}
            </Link>
          </div>
        </div>

        {searchOpen && (
          <div className="header-search">
            <form onSubmit={submitSearch}>
              <label htmlFor="global-search">Bạn đang tìm món đồ nào?</label>
              <div>
                <input
                  id="global-search"
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Ví dụ: áo thun, quần jeans..."
                />
                <button className="button button--accent" type="submit">Tìm kiếm</button>
              </div>
            </form>
          </div>
        )}

        <div className={`mobile-menu ${mobileOpen ? "is-open" : ""}`}>
          <nav aria-label="Điều hướng di động">
            {navItems.map((item) => <Link key={item.to} to={item.to}>{item.label}<span>→</span></Link>)}
            <Link to={user ? "/tai-khoan" : "/dang-nhap"}>{user ? "Tài khoản của tôi" : "Đăng nhập"}<span>→</span></Link>
            {user && <button type="button" onClick={logout}>Đăng xuất<span>→</span></button>}
          </nav>
        </div>
      </header>

      <main id="main-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="site-footer__top">
          <div className="footer-brand">
            <Logo inverted />
            <h2>{SITE.tagline}</h2>
            <p>{SITE.description}</p>
            <div className="footer-socials">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">fb</a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">ig</a>
              <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">tk</a>
            </div>
          </div>
          <div className="footer-links">
            <div>
              <h3>Mua sắm</h3>
              <Link to="/cua-hang">Tất cả sản phẩm</Link>
              <Link to="/cua-hang?sort=newest">Hàng mới</Link>
              <Link to="/yeu-thich">Danh sách đã lưu</Link>
              <Link to="/tra-cuu">Tra cứu đơn hàng</Link>
            </div>
            <div>
              <h3>Thông tin</h3>
              <Link to="/ve-chung-toi">Về NOVAWEAR</Link>
              <Link to="/chon-size">Hướng dẫn chọn size</Link>
              <Link to="/ho-tro">Đổi trả & giao hàng</Link>
              <Link to="/ho-tro">Liên hệ</Link>
            </div>
            <div>
              <h3>Kết nối</h3>
              <a href={`tel:${SITE.phone.replace(/\s/g, "")}`}>{SITE.phone}</a>
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              <p>{SITE.address}</p>
              <a href={SITE.adminUrl}>Khu vực nhân viên ↗</a>
            </div>
          </div>
        </div>
        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} {SITE.name}</span>
          <span>Thiết kế độc lập cho nhịp sống Việt.</span>
          <div><Link to="/ho-tro">Chính sách bảo mật</Link><Link to="/ho-tro">Điều khoản</Link></div>
        </div>
      </footer>
      <ToastViewport />
    </div>
  );
}
