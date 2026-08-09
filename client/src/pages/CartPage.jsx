import React from "react";
import { Link } from "react-router-dom";
import { EmptyState, SmartImage } from "../components/Common";
import { formatMoney, SITE } from "../config/site";
import { useShop } from "../context/ShopContext";

export default function CartPage() {
  const { cart, cartCount, cartSubtotal, updateCart, removeFromCart } = useShop();
  const remaining = Math.max(0, SITE.freeShippingThreshold - cartSubtotal);
  const progress = Math.min(100, (cartSubtotal / SITE.freeShippingThreshold) * 100);

  if (!cart.length) {
    return (
      <div className="cart-empty-page">
        <EmptyState
          headingLevel={1}
          symbol="◇"
          title="Giỏ hàng đang trống"
          copy="Khám phá các thiết kế mới và thêm những món phù hợp với nhịp sống của bạn."
          action={<Link className="button button--dark" to="/cua-hang">Bắt đầu mua sắm <span>→</span></Link>}
        />
        <div className="cart-empty-page__assurance">
          <div><span>01</span><strong>Đổi size 30 ngày</strong><small>Miễn phí cho lần đổi đầu tiên.</small></div>
          <div><span>02</span><strong>Giao hàng toàn quốc</strong><small>Theo dõi hành trình trong tài khoản.</small></div>
          <div><span>03</span><strong>Thanh toán an toàn</strong><small>COD hoặc chuyển khoản SePay.</small></div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <header className="cart-hero">
        <div>
          <p className="eyebrow">YOUR NOVA SELECTION</p>
          <h1>Giỏ hàng</h1>
          <p>{cartCount} sản phẩm đã sẵn sàng để hoàn thiện đơn hàng.</p>
        </div>
        <Link to="/cua-hang">Tiếp tục mua sắm <span>→</span></Link>
      </header>

      <section className={`shipping-progress ${remaining === 0 ? "is-complete" : ""}`}>
        <div>
          <span>{remaining > 0 ? <>Mua thêm <strong>{formatMoney(remaining)}</strong> để được miễn phí giao hàng</> : "Đơn hàng của bạn đã được miễn phí giao hàng"}</span>
          <strong>{Math.round(progress)}%</strong>
        </div>
        <i><b style={{ width: `${progress}%` }} /></i>
      </section>

      <div className="cart-layout">
        <section className="cart-items" aria-label="Sản phẩm trong giỏ hàng">
          <div className="cart-items__head">
            <span>Sản phẩm</span><span>Số lượng</span><span>Tạm tính</span>
          </div>
          {cart.map((item, index) => (
            <article className="cart-item" key={item.key}>
              <span className="cart-item__index">{String(index + 1).padStart(2, "0")}</span>
              <Link className="cart-item__image" to={`/san-pham/${item.slug || item.productId}`}>
                <SmartImage src={item.image} alt={item.name} />
              </Link>
              <div className="cart-item__info">
                <p>{item.sku || "NOVA ESSENTIAL"}</p>
                <h2><Link to={`/san-pham/${item.slug || item.productId}`}>{item.name}</Link></h2>
                <span>{item.color} · Size {item.size}</span>
                <strong>{formatMoney(item.price)}</strong>
                <small>{item.stock > 0 ? `Còn ${item.stock} sản phẩm trong kho` : "Hết hàng"}</small>
                <button type="button" onClick={() => removeFromCart(item.key)}>Xóa khỏi giỏ</button>
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
          <div className="order-summary__heading">
            <p className="eyebrow">ORDER SUMMARY</p>
            <h2>Tóm tắt đơn hàng</h2>
            <span>{cartCount} sản phẩm</span>
          </div>
          <div className="order-summary__lines">
            <div><span>Tạm tính</span><strong>{formatMoney(cartSubtotal)}</strong></div>
            <div><span>Phí vận chuyển</span><strong>{remaining === 0 ? "Miễn phí" : "Tính ở bước sau"}</strong></div>
            <div><span>Mã ưu đãi</span><Link to="/uu-dai">Xem mã khả dụng →</Link></div>
          </div>
          <div className="order-summary__total">
            <span>Tổng dự kiến<small>Đã bao gồm VAT</small></span>
            <strong>{formatMoney(cartSubtotal)}</strong>
          </div>
          <Link className="button button--dark button--wide" to="/thanh-toan">Tiến hành thanh toán <span>→</span></Link>
          <div className="payment-badges" aria-label="Phương thức thanh toán">
            <span>COD</span><span>VISA</span><span>ATM</span><span>QR</span>
          </div>
          <p className="secure-note">Thanh toán an toàn · Thông tin được bảo mật</p>
          <div className="order-summary__services">
            <p><strong>Đổi size trong 30 ngày</strong><span>Áp dụng khi sản phẩm còn nguyên tem.</span></p>
            <p><strong>Hỗ trợ mỗi ngày</strong><span>08:00–21:00 qua trung tâm hỗ trợ.</span></p>
          </div>
        </aside>
      </div>
    </div>
  );
}
