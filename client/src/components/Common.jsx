import React from "react";
import { Link } from "react-router-dom";
import { formatMoney, ORDER_STATUS } from "../config/site";
import { useShop } from "../context/ShopContext";
import Icon from "./Icon";

export function Logo({ inverted = false }) {
  return (
    <Link className={`brand-logo ${inverted ? "brand-logo--inverted" : ""}`} to="/" aria-label="NOVAWEAR - Trang chủ">
      <span className="brand-logo__mark">N</span>
      <span className="brand-logo__name">NOVAWEAR</span>
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

export function SmartImage({ src, alt, className = "", ...props }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.src = "/Images/11-0_672x990.jpg";
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
          <SmartImage src={product.image} alt={product.name} />
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

export function EmptyState({ title, copy, action, symbol = "○" }) {
  return (
    <div className="empty-state">
      <span className="empty-state__symbol" aria-hidden="true">{symbol}</span>
      <h2>{title}</h2>
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
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="modal-title">{title}</h2>
          <button type="button" aria-label="Đóng" onClick={onClose}>×</button>
        </header>
        <div className="modal__body">{children}</div>
      </section>
    </div>
  );
}
