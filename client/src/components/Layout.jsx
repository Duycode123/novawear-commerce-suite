import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { formatDate, SITE } from "../config/site";
import { useShop } from "../context/ShopContext";
import { Logo } from "./Common";
import Icon from "./Icon";
import ShopChat from "./ShopChat";

const navItems = [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/uu-dai", label: "Ưu đãi", badge: "Mới" },
  { to: "/chon-size", label: "Chọn size" },
  { to: "/tin-tuc", label: "Blog" },
  { to: "/ve-chung-toi", label: "Về NOVA" },
];

export default function Layout() {
  const {
    cartCount, wishlist, user, logout, notifications, notificationUnreadCount,
    markNotificationRead, markAllNotificationsRead,
  } = useShop();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [activeMegaMenu, setActiveMegaMenu] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setMobileOpen(false);
    setSearchOpen(false);
    setActiveMegaMenu("");
    setNotificationOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    let mounted = true;
    fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/categories`)
      .then((response) => response.ok ? response.json() : { data: [] })
      .then((result) => { if (mounted) setCategories(result.data || []); })
      .catch(() => { if (mounted) setCategories([]); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const root = document.getElementById("main-content");
    if (!root) return undefined;
    if (!("IntersectionObserver" in window)) return undefined;

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    const registerRevealElements = () => {
      const groups = [
        { selector: "h1, h2", className: "nova-reveal-heading" },
        { selector: "h3, .eyebrow", className: "nova-reveal-subtitle" },
        { selector: "img:not(.brand-logo img)", className: "nova-reveal-image" },
      ];

      groups.forEach(({ selector, className }) => {
        root.querySelectorAll(selector).forEach((element) => {
          if (element.dataset.novaReveal) return;
          const siblings = element.parentElement ? Array.from(element.parentElement.children) : [];
          const siblingIndex = Math.max(0, siblings.indexOf(element));
          element.dataset.novaReveal = "true";
          element.classList.add(className);
          element.style.setProperty("--nova-reveal-delay", `${Math.min(siblingIndex, 5) * 55}ms`);
          const bounds = element.getBoundingClientRect();
          const isAlreadyVisible = bounds.top < window.innerHeight * 0.96 && bounds.bottom > 0;
          if (isAlreadyVisible) {
            element.classList.add("is-revealed");
          } else {
            revealObserver.observe(element);
          }
        });
      });
    };

    const frame = window.requestAnimationFrame(registerRevealElements);
    const mutationObserver = new MutationObserver(registerRevealElements);
    mutationObserver.observe(root, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      revealObserver.disconnect();
    };
  }, [location.pathname, location.search]);

  const submitSearch = (event) => {
    event.preventDefault();
    const term = search.trim();
    navigate(term ? `/cua-hang?search=${encodeURIComponent(term)}` : "/cua-hang");
  };

  const menuCategories = (audience) => {
    const dedicated = categories.filter((item) => item.audience === audience);
    return dedicated.length ? dedicated : categories.filter((item) => item.audience === "all" || Number(item.audienceCounts?.[audience] || 0) > 0);
  };
  const menuTitle = activeMegaMenu === "men" ? "Dành cho Nam" : "Dành cho Nữ";
  const menuHref = `/cua-hang?audience=${activeMegaMenu}`;
  const menuEditorial = activeMegaMenu === "men"
    ? {
      image: "/Images/nova-v3/menu-men-editorial.png",
      eyebrow: "MEN'S EDIT",
      title: "Những lớp mặc tinh giản cho mọi lịch trình.",
    }
    : {
      image: "/Images/nova-v3/menu-women-editorial.png",
      eyebrow: "WOMEN'S EDIT",
      title: "Thanh lịch tự nhiên, hiện đại theo cách riêng.",
    };

  return (
    <div className="site-shell">
      <div className="announcement">
        <p>Miễn phí giao hàng từ 699K</p>
        <span aria-hidden="true">•</span>
        <p>Đổi size miễn phí trong 30 ngày</p>
        <Link to="/ho-tro">Cần hỗ trợ?</Link>
      </div>

      <header className="site-header" onMouseLeave={() => setActiveMegaMenu("")}>
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
            {navItems.slice(0, 1).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? "is-active" : "")}
              >
                <span>{item.label}</span>{item.badge && <em>{item.badge}</em>}
              </NavLink>
            ))}
            {[{ audience: "men", label: "Nam" }, { audience: "women", label: "Nữ" }].map((item) => (
              <button className={activeMegaMenu === item.audience ? "is-open" : ""} type="button" key={item.audience} onMouseEnter={() => setActiveMegaMenu(item.audience)} onFocus={() => setActiveMegaMenu(item.audience)} onClick={() => setActiveMegaMenu(item.audience)} aria-expanded={activeMegaMenu === item.audience}>{item.label}</button>
            ))}
            {navItems.slice(1).map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "is-active" : "")}> <span>{item.label}</span>{item.badge && <em>{item.badge}</em>} </NavLink>
            ))}
          </nav>
          <form className="header-search-inline" onSubmit={submitSearch}>
            <label className="sr-only" htmlFor="header-search-inline">Tìm kiếm sản phẩm</label>
            <input
              id="header-search-inline"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
            />
            <button type="submit" aria-label="Tìm kiếm"><Icon name="search" size={17} /></button>
          </form>
          <Link className="header-help-link" to="/ho-tro">Hỗ trợ</Link>
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
            {user && (
              <div className="customer-notifications">
                <button
                  className="header-action"
                  type="button"
                  aria-label="Thông báo đơn hàng"
                  aria-expanded={notificationOpen}
                  onClick={() => setNotificationOpen((value) => !value)}
                >
                  <span aria-hidden="true"><Icon name="bell" /></span><span className="header-action__label">Thông báo</span>
                  {notificationUnreadCount > 0 && <b>{notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}</b>}
                </button>
                {notificationOpen && (
                  <div className="customer-notification-menu">
                    <header><div><strong>Cập nhật của bạn</strong><small>{notificationUnreadCount} thông báo chưa đọc</small></div>{notificationUnreadCount > 0 && <button type="button" onClick={markAllNotificationsRead}>Đọc tất cả</button>}</header>
                    <div>
                      {notifications.length ? notifications.map((item) => (
                        <button
                          type="button"
                          className={item.readAt ? "" : "is-unread"}
                          key={item.id}
                          onClick={async () => {
                            if (!item.readAt) await markNotificationRead(item.id);
                            setNotificationOpen(false);
                            navigate(item.href || "/tai-khoan?tab=orders");
                          }}
                        >
                          <i /><span><strong>{item.title}</strong><small>{item.message}</small><time>{formatDate(item.createdAt, { hour: "2-digit", minute: "2-digit" })}</time></span>
                        </button>
                      )) : <p>Chưa có cập nhật mới.</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
            <Link className="header-action" to={user ? "/tai-khoan" : "/dang-nhap"}>
              <span aria-hidden="true"><Icon name="user" /></span><span className="header-action__label">{user ? user.name.split(" ").slice(-1)[0] : "Tài khoản"}</span>
            </Link>
            <Link className="header-action" to="/gio-hang">
              <span aria-hidden="true"><Icon name="bag" /></span><span className="header-action__label">Giỏ hàng</span>
              {cartCount > 0 && <b>{cartCount}</b>}
            </Link>
          </div>
        </div>

        {activeMegaMenu && (
          <div className="mega-menu" onMouseEnter={() => setActiveMegaMenu(activeMegaMenu)} onMouseLeave={() => setActiveMegaMenu("")}>
            <div className="mega-menu__inner">
              <div className="mega-menu__intro"><p>{menuTitle}</p><h2>Trang phục được chọn lọc cho nhịp sống hiện đại.</h2><span>Thiết kế dễ mặc, phom dáng chỉn chu và chất liệu phù hợp khí hậu Việt Nam.</span><Link to={menuHref}>Khám phá bộ sưu tập <b>↗</b></Link></div>
              <div className="mega-menu__links"><h3>Mua sắm</h3><Link to={`${menuHref}&sort=newest`}>Hàng mới về</Link><Link to={`${menuHref}&sort=rating`}>Đánh giá cao</Link><Link to={`${menuHref}&sort=popular`}>Được mua nhiều</Link><Link to={`${menuHref}&inStock=true`}>Sẵn sàng giao ngay</Link></div>
              <div className="mega-menu__links mega-menu__links--categories"><h3>Danh mục</h3>{menuCategories(activeMegaMenu).map((category) => <Link key={category.id} to={`${menuHref}&category=${category.slug}`}>{category.name}<small>{category.audienceCounts?.[activeMegaMenu]}</small></Link>)}{!menuCategories(activeMegaMenu).length && <span>Danh mục sẽ hiện khi admin thêm sản phẩm.</span>}</div>
              <Link className="mega-menu__feature" to={`${menuHref}&sort=rating`}><img src={menuEditorial.image} alt={`Biên tập thời trang ${menuTitle}`} /><span>{menuEditorial.eyebrow}</span><strong>{menuEditorial.title}</strong><em>Khám phá ngay ↗</em></Link>
            </div>
          </div>
        )}

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
            {navItems.slice(0, 1).map((item) => <Link key={item.to} to={item.to}>{item.label}<span>→</span></Link>)}
            <Link to="/cua-hang?audience=men">Nam<span>→</span></Link><Link to="/cua-hang?audience=women">Nữ<span>→</span></Link>
            {navItems.slice(1).map((item) => <Link key={item.to} to={item.to}>{item.label}<span>→</span></Link>)}
            <Link to="/ho-tro">Hỗ trợ<span>→</span></Link>
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
      <ShopChat />
    </div>
  );
}
