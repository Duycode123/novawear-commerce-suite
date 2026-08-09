import React from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { formatMoney, ORDER_STATUS } from "../config/site";
import { useShop } from "../context/ShopContext";
import Icon from "./Icon";

export function Logo({ inverted = false }) {
  return (
    <Link className={`brand-logo ${inverted ? "brand-logo--inverted" : ""}`} to="/" aria-label="NOVAWEAR - Trang chủ">
      <span className="brand-logo__mark" aria-hidden="true">
        <svg viewBox="0 0 48 36" role="presentation">
          <path d="M3 33V3h8.4l25.2 20.1V3H45v30h-8.4L11.4 12.9V33H3Z" />
          <path className="brand-logo__cut" d="M15.2 3h7.4L45 20.8v7.4L15.2 4.5V3Z" />
        </svg>
      </span>
      <span className="brand-logo__name"><strong>NOVA</strong><span>WEAR</span></span>
    </Link>
  );
}

export function SectionHeading({ eyebrow, title, copy, action, align = "left" }) {
  return (
    <div className={`section-heading section-heading--${align}`}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {copy && <p className="section-heading__copy">{copy}</p>}
      </div>
      {action && <div className="section-heading__action">{action}</div>}
    </div>
  );
}

function optimizedLocalSource(src) {
  if (typeof src !== "string") return src;
  const isNovaAsset = src.startsWith("/Images/nova-v3/");
  const isLookbookAsset = /^\/Images\/homepage-irl[135]\.png$/i.test(src);
  return (isNovaAsset || isLookbookAsset) && src.toLowerCase().endsWith(".png")
    ? src.replace(/\.png$/i, ".webp")
    : src;
}

function cloudinaryVariant(src, width, quality = "good") {
  const marker = "/image/upload/";
  if (!width || typeof src !== "string" || !src.includes("res.cloudinary.com") || !src.includes(marker)) {
    return src;
  }
  const [prefix, suffix] = src.split(marker);
  // secure_url returned by an untouched upload is versioned. Avoid stacking
  // transformations on hand-written or already transformed Cloudinary URLs.
  if (!/^v\d+\//.test(suffix || "")) return src;
  return `${prefix}${marker}c_limit,w_${Math.round(width)},q_auto:${quality},f_auto/${suffix}`;
}

export function SmartImage({
  src,
  alt,
  className = "",
  widthHint,
  responsiveWidths,
  sizes,
  quality = "good",
  loading = "lazy",
  fetchPriority,
  onError,
  ...props
}) {
  const optimizedSrc = optimizedLocalSource(src);
  const widths = widthHint
    ? (responsiveWidths || [Math.max(320, Math.round(widthHint / 2)), widthHint, Math.min(2400, widthHint * 1.5)])
      .map((value) => Math.round(value))
      .filter((value, index, values) => value > 0 && values.indexOf(value) === index)
    : [];
  const renderedSrc = cloudinaryVariant(optimizedSrc, widthHint, quality);
  const generatedSrcSet = widths.length > 1 && renderedSrc !== optimizedSrc
    ? widths.map((width) => `${cloudinaryVariant(optimizedSrc, width, quality)} ${width}w`).join(", ")
    : undefined;
  return (
    <img
      src={renderedSrc}
      srcSet={generatedSrcSet}
      sizes={generatedSrcSet ? (sizes || "100vw") : undefined}
      alt={alt}
      className={className}
      loading={loading}
      fetchpriority={fetchPriority || (loading === "eager" ? "high" : undefined)}
      decoding="async"
      onError={(event) => {
        event.currentTarget.removeAttribute("srcset");
        event.currentTarget.removeAttribute("sizes");
        const fallback = "/Images/nova-v3/product-tee-black.webp";
        if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
        onError?.(event);
      }}
      {...props}
    />
  );
}

export function ProductCard({ product, compact = false }) {
  const { addToCart, toggleWishlist, wishlist } = useShop();
  const wished = wishlist.some((item) => item.id === product.id);
  const detailUrl = `/san-pham/${product.slug || product.id}`;

  return (
    <article className={`product-card ${compact ? "product-card--compact" : ""}`}>
      <div className="product-card__media">
        <Link to={detailUrl} aria-label={`Xem ${product.name}`}>
          <SmartImage
            src={product.image}
            alt={product.name}
            widthHint={900}
            responsiveWidths={[420, 720, 900, 1200]}
            sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 25vw"
            quality="eco"
          />
        </Link>
        {product.badge && <span className="product-card__badge">{product.badge}</span>}
        <button
          className={`wishlist-button ${wished ? "is-active" : ""}`}
          type="button"
          aria-label={wished ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
          onClick={() => toggleWishlist(product)}
        >
          <Icon name="heart" size={19} filled={wished} />
        </button>
        <button
          className="product-card__quick"
          type="button"
          onClick={() => addToCart(product)}
          disabled={!product.stock}
        >
          {product.stock ? "Thêm nhanh" : "Tạm hết"}
        </button>
      </div>
      <div className="product-card__body">
        <div className="product-card__meta">
          <span>{product.category?.name || "NOVA essentials"}</span>
          {product.rating > 0 && <span>★ {product.rating}</span>}
        </div>
        <h3><Link to={detailUrl}>{product.name}</Link></h3>
        <div className="product-card__price">
          <strong>{formatMoney(product.price)}</strong>
          {product.comparePrice > product.price && <del>{formatMoney(product.comparePrice)}</del>}
        </div>
        {product.colors?.length > 0 && (
          <p className="product-card__colors">{product.colors.slice(0, 3).join(" · ")}</p>
        )}
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ count = 4 }) {
  return (
    <div className="product-grid" aria-label="Đang tải sản phẩm">
      {Array.from({ length: count }, (_, index) => (
        <div className="product-card product-card--skeleton" key={index}>
          <div className="skeleton skeleton--image" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line skeleton--short" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, copy, action, symbol = "○", headingLevel = 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className="empty-state">
      <span className="empty-state__symbol" aria-hidden="true">{symbol}</span>
      <Heading>{title}</Heading>
      <p>{copy}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <div>
        <strong>Chưa tải được nội dung</strong>
        <p>{message}</p>
      </div>
      {onRetry && <button className="button button--dark button--small" type="button" onClick={onRetry}>Thử lại</button>}
    </div>
  );
}

export function StatusPill({ status }) {
  const details = ORDER_STATUS[status] || { label: status, tone: "neutral" };
  return <span className={`status-pill status-pill--${details.tone}`}>{details.label}</span>;
}

export function ToastViewport() {
  const { toasts, removeToast } = useShop();
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div className={`toast toast--${toast.type}`} key={toast.id}>
          <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "!" : "i"}</span>
          <p>{toast.message}</p>
          <button type="button" aria-label="Đóng thông báo" onClick={() => removeToast(toast.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

export function Modal({ open, title, children, onClose, size = "medium" }) {
  const titleId = React.useId();
  const closeButtonRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id={titleId}>{title}</h2>
          <button ref={closeButtonRef} type="button" aria-label="Đóng" onClick={onClose}>×</button>
        </header>
        <div className="modal__body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
