import React, { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { formatMoney, SITE } from "../config/site";
import { useShop } from "../context/ShopContext";
import { SmartImage } from "../components/Common";

export default function CheckoutPage() {
  const { cart, cartSubtotal, user, clearCart, notify } = useShop();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: "",
    note: "",
    paymentMethod: "cod",
  });
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const shippingFee = useMemo(() => {
    if (cartSubtotal >= SITE.freeShippingThreshold) return 0;
    return Math.max(0, 30000 - Number(coupon?.shippingDiscount || 0));
  }, [cartSubtotal, coupon]);
  const discount = Number(coupon?.discount || 0);
  const total = cartSubtotal + shippingFee - discount;

  if (!cart.length) return <Navigate to="/gio-hang" replace />;

  const change = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const result = await api.post("/coupons/validate", { code: couponCode, subtotal: cartSubtotal });
      setCoupon(result.data);
      setCouponCode(result.data.code);
      notify("Mã ưu đãi đã được áp dụng.");
    } catch (requestError) {
      setCoupon(null);
      notify(requestError.message, "error");
    } finally {
      setCouponLoading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await api.post("/orders", {
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
        },
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
        couponCode: coupon?.code || "",
        paymentMethod: form.paymentMethod,
        note: form.note,
      });
      clearCart();
      navigate("/dat-hang-thanh-cong", { replace: true, state: { order: result.data } });
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <Link to="/gio-hang">← Trở lại giỏ hàng</Link>
        <div><span>N</span><strong>NOVAWEAR</strong></div>
        <p>Thanh toán an toàn</p>
      </header>
      <form className="checkout-layout" onSubmit={submit}>
        <main className="checkout-main">
          <div className="checkout-title"><p className="eyebrow">Almost there</p><h1>Thông tin giao hàng</h1></div>
          <section className="checkout-section">
            <div className="checkout-section__head"><span>01</span><div><h2>Người nhận</h2><p>Chúng tôi chỉ dùng thông tin này để giao đơn.</p></div></div>
            <div className="form-grid">
              <label className="field field--wide">
                <span>Họ và tên *</span>
                <input name="name" required minLength={2} value={form.name} onChange={change} placeholder="Nguyễn Văn A" />
              </label>
              <label className="field">
                <span>Số điện thoại *</span>
                <input name="phone" required pattern="[0-9+\s.-]{9,15}" value={form.phone} onChange={change} placeholder="090 123 4567" />
              </label>
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" value={form.email} onChange={change} placeholder="ban@email.com" />
              </label>
              <label className="field field--wide">
                <span>Địa chỉ nhận hàng *</span>
                <input name="address" required value={form.address} onChange={change} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
              </label>
              <label className="field field--wide">
                <span>Ghi chú cho đơn hàng</span>
                <textarea name="note" rows={3} value={form.note} onChange={change} maxLength={500} placeholder="Ví dụ: gọi trước khi giao..." />
              </label>
            </div>
          </section>

          <section className="checkout-section">
            <div className="checkout-section__head"><span>02</span><div><h2>Phương thức thanh toán</h2><p>Chọn cách thuận tiện nhất với bạn.</p></div></div>
            <div className="payment-options">
              <label className={form.paymentMethod === "cod" ? "is-active" : ""}>
                <input type="radio" name="paymentMethod" value="cod" checked={form.paymentMethod === "cod"} onChange={change} />
                <b>₫</b><span><strong>Thanh toán khi nhận hàng</strong><small>Thanh toán tiền mặt cho đơn vị vận chuyển.</small></span><i>✓</i>
              </label>
              <label className={form.paymentMethod === "bank" ? "is-active" : ""}>
                <input type="radio" name="paymentMethod" value="bank" checked={form.paymentMethod === "bank"} onChange={change} />
                <b>↗</b><span><strong>Chuyển khoản ngân hàng</strong><small>Thông tin chuyển khoản hiển thị sau khi đặt đơn.</small></span><i>✓</i>
              </label>
              <label className={form.paymentMethod === "wallet" ? "is-active" : ""}>
                <input type="radio" name="paymentMethod" value="wallet" checked={form.paymentMethod === "wallet"} onChange={change} />
                <b>◈</b><span><strong>Ví điện tử / QR</strong><small>Quét mã nhanh qua ứng dụng ngân hàng.</small></span><i>✓</i>
              </label>
            </div>
          </section>
        </main>

        <aside className="checkout-summary">
          <h2>Đơn hàng <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} món</span></h2>
          <div className="checkout-items">
            {cart.map((item) => (
              <div className="checkout-item" key={item.key}>
                <SmartImage src={item.image} alt={item.name} />
                <div><strong>{item.name}</strong><span>{item.color} · {item.size} · SL {item.quantity}</span></div>
                <b>{formatMoney(item.price * item.quantity)}</b>
              </div>
            ))}
          </div>
          <div className="coupon-box">
            <label htmlFor="coupon">Mã ưu đãi</label>
            <div>
              <input id="coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="NOVA10" />
              <button type="button" onClick={applyCoupon} disabled={couponLoading}>{couponLoading ? "..." : "Áp dụng"}</button>
            </div>
            {coupon && <p>✓ Đã áp dụng mã {coupon.code}</p>}
          </div>
          <div className="checkout-totals">
            <div><span>Tạm tính</span><strong>{formatMoney(cartSubtotal)}</strong></div>
            <div><span>Phí giao hàng</span><strong>{shippingFee ? formatMoney(shippingFee) : "Miễn phí"}</strong></div>
            {discount > 0 && <div className="discount-line"><span>Ưu đãi</span><strong>−{formatMoney(discount)}</strong></div>}
            <div className="checkout-total"><span>Tổng thanh toán<small>Đã gồm VAT</small></span><strong>{formatMoney(total)}</strong></div>
          </div>
          <button className="button button--accent button--wide" type="submit" disabled={submitting}>
            {submitting ? "Đang tạo đơn..." : `Đặt hàng · ${formatMoney(total)}`}
          </button>
          <p className="checkout-terms">Khi đặt hàng, bạn đồng ý với <Link to="/ho-tro">điều khoản mua hàng</Link> và chính sách bảo mật.</p>
        </aside>
      </form>
    </div>
  );
}
