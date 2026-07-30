import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { formatDate, formatMoney, PAYMENT_STATUS } from "../config/site";
import { SmartImage, StatusPill } from "../components/Common";

export default function TrackingPage() {
  const [form, setForm] = useState({ code: "", phone: "" });
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookup, setLookup] = useState(null);

  const findOrder = useCallback(async (credentials, { silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError("");
      setOrder(null);
    }
    try {
      const result = await api.get(`/orders/track/${encodeURIComponent(credentials.code.trim())}?phone=${encodeURIComponent(credentials.phone.trim())}`);
      setOrder(result.data);
    } catch (requestError) {
      if (!silent) setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const credentials = { code: form.code.trim(), phone: form.phone.trim() };
    setLookup(credentials);
    await findOrder(credentials);
  };

  useEffect(() => {
    if (!lookup) return undefined;
    const timer = window.setInterval(() => findOrder(lookup, { silent: true }), 15000);
    return () => window.clearInterval(timer);
  }, [lookup, findOrder]);

  return (
    <div className="tracking-page">
      <section className="tracking-hero">
        <p className="eyebrow">Order tracking</p>
        <h1>Đơn của bạn<br />đang ở đâu?</h1>
        <p>Nhập mã tra cứu và số điện thoại đã dùng khi đặt hàng.</p>
        <form onSubmit={submit}>
          <label><span>Mã tra cứu</span><input required value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="Ví dụ: NVA26A1B2C3D4E5F6" /></label>
          <label><span>Số điện thoại</span><input required value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="090 123 4567" /></label>
          <button className="button button--accent" type="submit" disabled={loading}>{loading ? "Đang tìm..." : "Tra cứu →"}</button>
        </form>
        {error && <p className="tracking-error" role="alert">{error}</p>}
      </section>

      {order && (
        <section className="tracking-result">
          <header><div><p className="eyebrow">Tìm thấy đơn hàng</p><h2>{order.id}</h2><span>Đặt ngày {formatDate(order.createdAt)} · Tự động đồng bộ mỗi 15 giây</span></div><StatusPill status={order.status} /></header>
          <div className={`tracking-payment tracking-payment--${order.paymentStatus}`}><span>Thanh toán</span><strong>{PAYMENT_STATUS[order.paymentStatus]?.label || order.paymentStatus}</strong>{order.paymentStatus === "refund_pending" && <small>Khoản hoàn đang được bộ phận tài chính đối soát.</small>}</div>
          {order.status === "delivery_failed" && <div className="order-alert order-alert--danger"><strong>Giao hàng chưa thành công</strong><p>{order.lastDeliveryFailure?.reason || "NOVAWEAR đang phối hợp với đơn vị vận chuyển để giao lại."}</p></div>}
          <div className="tracking-timeline">
            {order.timeline.map((entry, index) => (
              <div className="is-done" key={entry.id || `${entry.status}-${index}`}>
                <i>✓</i><span><strong>{entry.label}</strong>{entry.note && <p>{entry.note}</p>}<small>{entry.actorName || "Hệ thống NOVAWEAR"} · {formatDate(entry.at, { hour: "2-digit", minute: "2-digit" })}</small></span>
              </div>
            ))}
          </div>
          {order.shipment?.trackingNumber && <div className="order-shipment"><div><span>Đơn vị vận chuyển</span><strong>{order.shipment.carrier}</strong></div><div><span>Mã vận đơn</span><strong>{order.shipment.trackingNumber}</strong></div><div><span>Số lần giao</span><strong>{order.deliveryAttempts || 1}</strong></div>{order.shipment.estimatedDeliveryAt && <div><span>Dự kiến giao</span><strong>{formatDate(order.shipment.estimatedDeliveryAt, { hour: "2-digit", minute: "2-digit" })}</strong></div>}</div>}
          <div className="tracking-details">
            <div><span>Giao tới</span><strong>{order.customer.name}</strong><p>{order.customer.address}</p><p>{order.customer.phone}</p></div>
            <div className="tracking-products">
              {order.items.map((item, index) => (
                <div key={`${item.productId}-${index}`}><SmartImage src={item.image} alt={item.name} /><span><strong>{item.name}</strong><small>{item.color} · {item.size} · SL {item.quantity}</small></span><b>{formatMoney(item.price * item.quantity)}</b></div>
              ))}
            </div>
            <div className="tracking-total"><span>Tổng thanh toán</span><strong>{formatMoney(order.total)}</strong></div>
          </div>
        </section>
      )}

      {!order && (
        <section className="tracking-help">
          <div><span>?</span><h3>Không thấy mã đơn?</h3><p>Mã tra cứu nằm trong thông báo xác nhận sau khi đặt hàng.</p></div>
          <div><span>⌁</span><h3>Cần đổi địa chỉ?</h3><p>Liên hệ trong 2 giờ đầu để được hỗ trợ nhanh nhất.</p></div>
          <div><span>↺</span><h3>Muốn đổi size?</h3><p>Chúng tôi hỗ trợ đổi size miễn phí trong 30 ngày.</p></div>
        </section>
      )}
    </div>
  );
}
