import React from "react";
import { Link } from "react-router-dom";
import { EmptyState, SmartImage } from "../components/Common";
import { formatMoney, SITE } from "../config/site";
import { useShop } from "../context/ShopContext";

export default function CartPage() {
  const { cart, cartSubtotal, updateCart, removeFromCart } = useShop();
  const remaining = Math.max(0, SITE.freeShippingThreshold - cartSubtotal);
  const progress = Math.min(100, (cartSubtotal / SITE.freeShippingThreshold) * 100);

  if (!cart.length) {
    return (
      <div className="page-narrow">
        <EmptyState
          symbol="▢"
          title="Giỏ hàng đang nhẹ tênh"
          copy="Khám phá những món đồ mới và quay lại đây khi bạn đã chọn được món ưng ý."
          action={<Link className="button button--dark" to="/cua-hang">Bắt đầu mua sắm</Link>}
        />
      </div>
    );
  }

  return (
    <div className="cart-page section">
      <header className="page-title-row">
        <div><p className="eyebrow">Your selection</p><h1>Giỏ hàng</h1></div>
        <Link className="text-link" to="/cua-hang">Tiếp tục mua sắm <span>→</span></Link>
      </header>

      <div className="shipping-progress">
        <div>
          <span>{remaining > 0 ? `Mua thêm ${formatMoney(remaining)} để được miễn phí giao hàng` : "Đơn hàng của bạn được miễn phí giao hàng!"}</span>
          <strong>{Math.round(progress)}%</strong>
        </div>
        <i><b style={{ width: `${progress}%` }} /></i>
      </div>

      <div className="cart-layout">
        <section className="cart-items">
          <div className="cart-items__head">
            <span>Sản phẩm</span><span>Số lượng</span><span>Tạm tính</span>
          </div>
          {cart.map((item) => (
            <article className="cart-item" key={item.key}>
              <Link className="cart-item__image" to={`/san-pham/${item.slug || item.productId}`}>
                <SmartImage src={item.image} alt={item.name} />
              </Link>
              <div className="cart-item__info">
                <p>{item.sku}</p>
                <h2><Link to={`/san-pham/${item.slug || item.productId}`}>{item.name}</Link></h2>
                <span>{item.color} · Size {item.size}</span>
                <strong>{formatMoney(item.price)}</strong>
                <button type="button" onClick={() => removeFromCart(item.key)}>Xóa</button>
              </div>
              <div className="quantity-picker cart-item__quantity">
                <button type="button" aria-label="Giảm số lượng" onClick={() => item.quantity === 1 ? removeFromCart(item.key) : updateCart(item.key, item.quantity - 1)}>−</button>
                <span>{item.quantity}</span>
                <button type="button" aria-label="Tăng số lượng" onClick={() => updateCart(item.key, item.quantity + 1)}>＋</button>
              </div>
              <strong className="cart-item__total">{formatMoney(item.price * item.quantity)}</strong>
            </article>
          ))}
        </section>

        <aside className="order-summary">
          <p className="eyebrow">Tóm tắt</p>
          <h2>Đơn hàng của bạn</h2>
          <div className="order-summary__lines">
            <div><span>Tạm tính</span><strong>{formatMoney(cartSubtotal)}</strong></div>
            <div><span>Giao hàng</span><strong>{remaining === 0 ? "Miễn phí" : "Tính ở bước sau"}</strong></div>
          </div>
          <div className="order-summary__total">
            <span>Tổng dự kiến<small>Đã gồm VAT</small></span>
            <strong>{formatMoney(cartSubtotal)}</strong>
          </div>
          <Link className="button button--accent button--wide" to="/thanh-toan">Đi tới thanh toán <span>→</span></Link>
          <div className="payment-badges">
            <span>COD</span><span>VISA</span><span>ATM</span><span>QR</span>
          </div>
          <p className="secure-note">✓ Thanh toán an toàn · Thông tin được bảo mật</p>
        </aside>
      </div>
    </div>
  );
}
