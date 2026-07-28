import React, { useState } from "react";
import { api } from "../services/api";
import { formatDate, formatMoney } from "../config/site";
import { SmartImage, StatusPill } from "../components/Common";

export default function TrackingPage() {
  const [form, setForm] = useState({ code: "", phone: "" });
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const result = await api.get(`/orders/track/${encodeURIComponent(form.code.trim())}?phone=${encodeURIComponent(form.phone.trim())}`);
      setOrder(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tracking-page">
      <section className="tracking-hero">
        <p className="eyebrow">Order tracking</p>
        <h1>Đơn của bạn<br />đang ở đâu?</h1>
        <p>Nhập mã tra cứu và số điện thoại đã dùng khi đặt hàng.</p>
        <form onSubmit={submit}>
          <label><span>Mã tra cứu</span><input required value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="Ví dụ: NVA260001" /></label>
          <label><span>Số điện thoại</span><input required value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="090 123 4567" /></label>
          <button className="button button--accent" type="submit" disabled={loading}>{loading ? "Đang tìm..." : "Tra cứu →"}</button>
        </form>
        {error && <p className="tracking-error" role="alert">{error}</p>}
      </section>

      {order && (
        <section className="tracking-result">
          <header><div><p className="eyebrow">Tìm thấy đơn hàng</p><h2>{order.id}</h2><span>Đặt ngày {formatDate(order.createdAt)}</span></div><StatusPill status={order.status} /></header>
          <div className="tracking-timeline">
            {order.timeline.map((entry, index) => (
              <div className="is-done" key={`${entry.status}-${index}`}>
                <i>✓</i><span><strong>{entry.label}</strong><small>{formatDate(entry.at, { hour: "2-digit", minute: "2-digit" })}</small></span>
              </div>
            ))}
          </div>
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
