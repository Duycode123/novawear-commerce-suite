import React from "react";
import { EMPLOYEE_STATUS, ORDER_STATUS, resolveAsset } from "../config";
import { useAdmin } from "../context/AdminContext";

export function Status({ value, type = "order" }) {
  const map = type === "employee" ? EMPLOYEE_STATUS : ORDER_STATUS;
  const status = map[value] || {
    label: value === "active" ? "Hoạt động" : value === "inactive" ? "Ngừng hoạt động" : value,
    tone: value === "active" ? "green" : "neutral",
  };
  return <span className={`ops-status ops-status--${status.tone}`}>{status.label}</span>;
}

export function ProductImage({ src, alt = "", className = "" }) {
  return (
    <img
      src={resolveAsset(src)}
      alt={alt}
      className={className}
      onError={(event) => {
        event.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

export function Modal({ open, title, subtitle, children, onClose, wide = false }) {
  if (!open) return null;
  return (
    <div className="ops-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`ops-modal ${wide ? "ops-modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ops-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div><h2 id="ops-modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button type="button" aria-label="Đóng" onClick={onClose}>×</button>
        </header>
        <div className="ops-modal__body">{children}</div>
      </section>
    </div>
  );
}

export function PageHeader({ eyebrow, title, copy, actions }) {
  return (
    <header className="ops-page-header">
      <div><p>{eyebrow}</p><h1>{title}</h1>{copy && <span>{copy}</span>}</div>
      {actions && <div className="ops-page-header__actions">{actions}</div>}
    </header>
  );
}

export function Loading({ rows = 4 }) {
  return (
    <div className="ops-loading">
      {Array.from({ length: rows }, (_, index) => <div key={index} />)}
    </div>
  );
}

export function Empty({ title, copy, action }) {
  return (
    <div className="ops-empty">
      <span>○</span><h3>{title}</h3><p>{copy}</p>{action}
    </div>
  );
}

export function ErrorPanel({ message, onRetry }) {
  return (
    <div className="ops-error" role="alert">
      <div><strong>Không tải được dữ liệu</strong><p>{message}</p></div>
      {onRetry && <button type="button" onClick={onRetry}>Thử lại</button>}
    </div>
  );
}

export function Toasts() {
  const { toasts, removeToast } = useAdmin();
  return (
    <div className="ops-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`ops-toast ops-toast--${toast.type}`} key={toast.id}>
          <span>{toast.type === "error" ? "!" : "✓"}</span>
          <p>{toast.message}</p>
          <button type="button" aria-label="Đóng" onClick={() => removeToast(toast.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
