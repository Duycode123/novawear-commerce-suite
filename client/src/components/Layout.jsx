import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { formatDate, SITE } from "../config/site";
import { useShop } from "../context/ShopContext";
import { saveRecentSearch } from "../services/searchHistory";
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
  const [headerVisible, setHeaderVisible] = useState(true);
  const [backToTopVisible, setBackToTopVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const targetId = decodeURIComponent(location.hash.replace(/^#/, ""));
    const timer = window.setTimeout(() => {
      if (targetId) document.getElementById(targetId)?.scrollIntoView({ block: "start" });
      else window.scrollTo({ top: 0, behavior: "instant" });
    }, 60);
    setMobileOpen(false);
    setSearchOpen(false);
    setActiveMegaMenu("");
    setNotificationOpen(false);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    let lastScrollY = Math.max(0, window.scrollY);
    let frame = 0;
    const updateScrollUi = () => {
      const currentScrollY = Math.max(0, window.scrollY);
      const delta = currentScrollY - lastScrollY;
      setBackToTopVisible(currentScrollY > 520);
      if (currentScrollY < 96 || mobileOpen || searchOpen || activeMegaMenu) {
        setHeaderVisible(true);
      } else if (Math.abs(delta) > 7) {
        setHeaderVisible(delta < 0);
      }
      lastScrollY = currentScrollY;
      frame = 0;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScrollUi);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    updateScrollUi();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [activeMegaMenu, mobileOpen, searchOpen]);

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
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const queuedVisible = new Set();
    let outerFrame = 0;
    let innerFrame = 0;
    let safetyTimer = 0;

    const revealElement = (element) => {
      if (!element?.isConnected) return;
      element.classList.add("is-revealed");
    };

    const flushVisibleQueue = () => {
      if (outerFrame) return;
      outerFrame = window.requestAnimationFrame(() => {
        innerFrame = window.requestAnimationFrame(() => {
          queuedVisible.forEach(revealElement);
          queuedVisible.clear();
          outerFrame = 0;
          innerFrame = 0;
        });
      });
    };

    const revealObserver = !reducedMotion && "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealElement(entry.target);
          revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -7% 0px", threshold: 0.075 })
      : null;

    const registerRevealElements = () => {
      const groups = [
        {
          selector: "h1, h2",
          className: "nova-motion-heading",
        },
        {
          selector: "h3, .eyebrow, blockquote",
          className: "nova-motion-kicker",
        },
        {
          selector: [
            ".product-card",
            ".news-card",
            ".offer-card",
            ".promotion-card",
            ".category-tile",
            ".review-story",
            ".product-editorial-card",
            ".cart-item",
            ".order-card",
            ".faq-item",
            ".support-shortcuts > *",
            ".home-v4-categories > a",
            ".home-v4-occasion-grid > a",
            ".home-v4-gender > a",
            ".home-v4-journal > div > a",
            ".home-v4-benefits > article",
            ".policy-strip > div",
          ].join(", "),
          className: "nova-motion-card",
        },
        {
          selector: [
            "figure",
            ".home-v4-hero__media",
            ".home-v4-story__media",
            ".product-gallery__main",
            ".nova-about-hero__visual",
            ".lifestyle-hero__visual",
            ".news-detail__hero",
            "img:not(.brand-logo img)",
          ].join(", "),
          className: "nova-motion-media",
        },
        {
          selector: [
            "section > header",
            ".product-info",
            ".contact-form",
            ".size-calculator__form",
            ".size-result",
            ".cart-summary",
            ".checkout-summary",
            ".account-header",
            ".catalog-sidebar",
            ".review-overview",
          ].join(", "),
          className: "nova-motion-block",
        },
      ];

      groups.forEach(({ selector, className }) => {
        root.querySelectorAll(selector).forEach((element, groupIndex) => {
          if (element.dataset.novaMotion) return;
          if (
            className === "nova-motion-media"
            && element.tagName === "IMG"
            && element.closest(
              "figure, .product-card, .news-card, .offer-card, .promotion-card, .category-tile, .home-v4-hero__media, .home-v4-story__media, .home-v4-occasion-grid > a, .home-v4-gender > a, .home-v4-journal > div > a",
            )
          ) {
            return;
          }
          const siblings = element.parentElement ? Array.from(element.parentElement.children) : [];
          const siblingIndex = Math.max(0, siblings.indexOf(element));
          element.dataset.novaMotion = "true";
          element.classList.add(className);
          const order = Math.min(
            siblingIndex >= 0 ? siblingIndex : groupIndex,
            5,
          );
          element.style.setProperty("--nova-motion-delay", `${order * 65}ms`);

          if (reducedMotion || !revealObserver) {
            revealElement(element);
            return;
          }
          const bounds = element.getBoundingClientRect();
          const isAlreadyVisible = bounds.top < window.innerHeight * 0.98 && bounds.bottom > 0;
          if (isAlreadyVisible) {
            queuedVisible.add(element);
          } else {
            revealObserver.observe(element);
          }
        });
      });
      flushVisibleQueue();
      window.clearTimeout(safetyTimer);
      safetyTimer = window.setTimeout(() => {
        root.querySelectorAll("[data-nova-motion]:not(.is-revealed)").forEach((element) => {
          const bounds = element.getBoundingClientRect();
          if (bounds.top < window.innerHeight * 1.15 && bounds.bottom > -100) {
            revealElement(element);
          }
        });
      }, 1800);
    };

    root.classList.add("nova-motion-ready");
    const frame = window.requestAnimationFrame(registerRevealElements);
    const mutationObserver = new MutationObserver(registerRevealElements);
    mutationObserver.observe(root, { childList: true, subtree: true });

    return () => {
      root.classList.remove("nova-motion-ready");
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(outerFrame);
      window.cancelAnimationFrame(innerFrame);
      window.clearTimeout(safetyTimer);
      mutationObserver.disconnect();
      revealObserver?.disconnect();
    };
  }, [location.pathname, location.search]);

  const submitSearch = (event) => {
    event.preventDefault();
    const term = search.trim();
    if (term) saveRecentSearch(term);
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
      image: "/Images/nova-v3/menu-men-editorial.webp",
      eyebrow: "MEN'S EDIT",
      title: "Những lớp mặc tinh giản cho mọi lịch trình.",
    }
    : {
      image: "/Images/nova-v3/menu-women-editorial.webp",
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

      <header className={`site-header ${headerVisible ? "is-visible" : "is-hidden"}`} onMouseLeave={() => setActiveMegaMenu("")}>
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
              <div className="mega-menu__links mega-menu__links--categories"><h3>Danh mục</h3>{menuCategories(activeMegaMenu).map((category) => <Link key={category.id} to={`${menuHref}&category=${category.slug}`}>{category.name}<small>{category.audienceCounts?.[activeMegaMenu]}</small></Link>)}{!menuCategories(activeMegaMenu).length && <span>Hiện chưa có danh mục phù hợp.</span>}</div>
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
        <div
          className="nova-route-stage"
          key={`${location.pathname}${location.search}`}
        >
          <Outlet />
        </div>
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
              <Link to="/chinh-sach/giao-hang-doi-tra">Đổi trả & giao hàng</Link>
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
          <div><Link to="/chinh-sach/bao-mat">Chính sách bảo mật</Link><Link to="/chinh-sach/dieu-khoan">Điều khoản</Link></div>
        </div>
      </footer>
      <button
        className={`back-to-top ${backToTopVisible ? "is-visible" : ""}`}
        type="button"
        aria-label="Cuộn về đầu trang"
        title="Về đầu trang"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <span aria-hidden="true">↑</span>
        <small>Đầu trang</small>
      </button>
      <ShopChat />
    </div>
  );
}
