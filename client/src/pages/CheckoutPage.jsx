import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { formatMoney, SITE } from "../config/site";
import { useShop } from "../context/ShopContext";
import { SmartImage } from "../components/Common";

export default function CheckoutPage() {
  const { cart, cartSubtotal, user, clearCart, notify, integrations } = useShop();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    note: "",
    shippingMethod: "standard",
    paymentMethod: "cod",
  });
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailVerification, setEmailVerification] = useState({
    requested: false,
    code: "",
    checkoutToken: "",
    verifiedEmail: "",
  });
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(Boolean(user));
  const touchedRecipientFields = useRef(new Set());
  const activeUserId = useRef(user?.id || null);
  const checkoutRequestId = useRef(
    window.crypto?.randomUUID?.()
      || `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
  );

  const standardShippingFee = useMemo(() => {
    if (cartSubtotal >= SITE.freeShippingThreshold) return 0;
    return Math.max(0, 30000 - Number(coupon?.shippingDiscount || 0));
  }, [cartSubtotal, coupon]);
  const shippingFee = form.shippingMethod === "express" ? 60000 : standardShippingFee;
  const discount = Number(coupon?.discount || 0);
  const total = cartSubtotal + shippingFee - discount;

  useEffect(() => {
    let active = true;

    if (!user) {
      if (activeUserId.current) {
        touchedRecipientFields.current = new Set();
        setForm((current) => ({
          ...current,
          name: "",
          email: "",
          phone: "",
          address: "",
        }));
      }
      activeUserId.current = null;
      setProfileLoading(false);
      return undefined;
    }

    if (activeUserId.current !== user.id) {
      touchedRecipientFields.current = new Set();
    }
    activeUserId.current = user.id;

    const mergeProfile = (profile) => {
      if (!active) return;
      setForm((current) => {
        const next = { ...current };
        ["name", "email", "phone", "address"].forEach((field) => {
          if (!touchedRecipientFields.current.has(field)) {
            next[field] = profile[field] || "";
          }
        });
        return next;
      });
    };

    mergeProfile({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
    });
    setProfileLoading(true);

    api.get("/auth/me")
      .then((result) => {
        const account = result.user || user;
        const customerProfile = result.customer || result.employee || {};
        mergeProfile({
          name: account.name || user.name,
          email: account.email || user.email,
          phone: account.phone || customerProfile.phone || user.phone,
          address: customerProfile.address || user.address,
        });
      })
      .catch(() => {
        if (active) {
          notify("Chưa tải được địa chỉ mặc định. Bạn có thể nhập phần còn thiếu.", "info");
        }
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [notify, user]);

  if (!cart.length) return <Navigate to="/gio-hang" replace />;

  const change = (event) => {
    const { name, value } = event.target;
    if (["name", "email", "phone", "address"].includes(name)) {
      touchedRecipientFields.current.add(name);
    }
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "email" && !user) {
      setEmailVerification({ requested: false, code: "", checkoutToken: "", verifiedEmail: "" });
    }
  };

  const requestEmailCode = async () => {
    if (!form.email || !form.name) {
      notify("Vui lòng nhập họ tên và email trước.", "error");
      return;
    }
    setVerificationLoading(true);
    try {
      const result = await api.post("/checkout/verification/request", {
        email: form.email,
        name: form.name,
      });
      setEmailVerification((current) => ({
        ...current,
        requested: true,
        code: result.verificationCode || "",
        checkoutToken: "",
      }));
      notify(result.message, "info");
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setVerificationLoading(false);
    }
  };

  const verifyGuestEmail = async () => {
    setVerificationLoading(true);
    try {
      const result = await api.post("/checkout/verification/verify", {
        email: form.email,
        code: emailVerification.code,
      });
      setEmailVerification((current) => ({
        ...current,
        checkoutToken: result.checkoutToken,
        verifiedEmail: form.email.trim().toLowerCase(),
      }));
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setVerificationLoading(false);
    }
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
    if (!user && (!emailVerification.checkoutToken
      || emailVerification.verifiedEmail !== form.email.trim().toLowerCase())) {
      notify("Vui lòng xác minh email trước khi đặt hàng.", "error");
      return;
    }
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
        shippingMethod: form.shippingMethod,
        paymentMethod: form.paymentMethod,
        note: form.note,
        checkoutToken: emailVerification.checkoutToken,
        requestId: checkoutRequestId.current,
      });
      notify(result.message, result.warning ? "info" : "success");
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
            <div className="checkout-section__head">
              <span>01</span>
              <div>
                <h2>Người nhận</h2>
                <p>
                  {user
                    ? (profileLoading
                      ? "Đang lấy thông tin từ hồ sơ của bạn…"
                      : "Thông tin từ hồ sơ của bạn.")
                    : "Khách vãng lai vui lòng nhập thông tin để chúng tôi giao và xác nhận đơn hàng."}
                </p>
              </div>
            </div>
            <div className="form-grid">
              <label className="field field--wide">
                <span>Họ và tên *</span>
                <input name="name" autoComplete="name" required minLength={2} value={form.name} onChange={change} placeholder="Nguyễn Văn A" />
              </label>
              <label className="field">
                <span>Số điện thoại *</span>
                <input name="phone" autoComplete="tel" required pattern="[0-9+\s.-]{9,15}" value={form.phone} onChange={change} placeholder="090 123 4567" />
              </label>
              <label className="field">
                <span>Email nhận xác nhận *</span>
                <input name="email" type="email" autoComplete="email" required readOnly={Boolean(user)} value={form.email} onChange={change} placeholder="ban@email.com" />
              </label>
              <label className="field field--wide">
                <span>Địa chỉ nhận hàng *</span>
                <input name="address" autoComplete="street-address" required value={form.address} onChange={change} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
              </label>
              <label className="field field--wide">
                <span>Ghi chú cho đơn hàng</span>
                <textarea name="note" rows={3} value={form.note} onChange={change} maxLength={500} placeholder="Ví dụ: gọi trước khi giao..." />
              </label>
            </div>
            {!user && (
              <div className={`checkout-email-verification ${emailVerification.checkoutToken ? "is-verified" : ""}`}>
                <div>
                  <strong>{emailVerification.checkoutToken ? "✓ Email đã được xác minh" : "Xác minh email đặt hàng"}</strong>
                  <p>Chúng tôi gửi mã 6 số để bảo đảm đúng người đặt và gửi xác nhận đơn hàng.</p>
                </div>
                {!emailVerification.requested && (
                  <button type="button" onClick={requestEmailCode} disabled={verificationLoading}>
                    {verificationLoading ? "Đang gửi…" : "Gửi mã xác minh"}
                  </button>
                )}
                {emailVerification.requested && !emailVerification.checkoutToken && (
                  <div className="checkout-email-verification__code">
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={emailVerification.code}
                      onChange={(event) => setEmailVerification((current) => ({
                        ...current,
                        code: event.target.value.replace(/\D/g, ""),
                      }))}
                      placeholder="Nhập mã 6 số"
                      aria-label="Mã xác minh email"
                    />
                    <button type="button" onClick={verifyGuestEmail} disabled={verificationLoading || emailVerification.code.length !== 6}>
                      {verificationLoading ? "Đang kiểm tra…" : "Xác nhận"}
                    </button>
                    <button type="button" className="is-link" onClick={requestEmailCode} disabled={verificationLoading}>Gửi lại</button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="checkout-section">
            <div className="checkout-section__head"><span>02</span><div><h2>Phương thức giao hàng</h2><p>Chọn tốc độ phù hợp với lịch trình của bạn.</p></div></div>
            <div className="shipping-options">
              <label className={form.shippingMethod === "standard" ? "is-active" : ""}>
                <input type="radio" name="shippingMethod" value="standard" checked={form.shippingMethod === "standard"} onChange={change} />
                <span><strong>Giao hàng tiêu chuẩn</strong><small>Nhận hàng trong 2–3 ngày</small></span><b>{standardShippingFee ? formatMoney(standardShippingFee) : "Miễn phí"}</b>
              </label>
              <label className={form.shippingMethod === "express" ? "is-active" : ""}>
                <input type="radio" name="shippingMethod" value="express" checked={form.shippingMethod === "express"} onChange={change} />
                <span><strong>Giao hàng hỏa tốc</strong><small>Nội thành · nhận trong ngày</small></span><b>60.000 ₫</b>
              </label>
            </div>
          </section>

          <section className="checkout-section">
            <div className="checkout-section__head"><span>03</span><div><h2>Phương thức thanh toán</h2><p>Chọn cách thuận tiện nhất với bạn.</p></div></div>
            <div className="payment-options">
              {integrations.sepay && <label className={form.paymentMethod === "bank" ? "is-active" : ""}>
                <input type="radio" name="paymentMethod" value="bank" checked={form.paymentMethod === "bank"} onChange={change} />
                <b className="sepay-mark">SePay</b><span><strong>Chuyển khoản qua SePay</strong><small>Quét QR, đối soát thanh toán tự động.</small></span><i>✓</i>
              </label>}
              <label className={form.paymentMethod === "cod" ? "is-active" : ""}>
                <input type="radio" name="paymentMethod" value="cod" checked={form.paymentMethod === "cod"} onChange={change} />
                <b>₫</b><span><strong>Thanh toán khi nhận hàng</strong><small>Thanh toán tiền mặt cho đơn vị vận chuyển.</small></span><i>✓</i>
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
