import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { formatMoney } from "../config/site";

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const order = state?.order;
  if (!order) return <Navigate to="/" replace />;

  return (
    <div className="success-page">
      <div className="success-mark"><span>✓</span></div>
      <p className="eyebrow">Order confirmed</p>
      <h1>Cảm ơn bạn.<br />Đơn hàng đã được ghi nhận!</h1>
      <p>Chúng tôi sẽ liên hệ xác nhận và chuẩn bị đơn trong thời gian sớm nhất.</p>
      <div className="success-order">
        <div><span>Mã đơn hàng</span><strong>{order.id}</strong></div>
        <div><span>Mã tra cứu</span><strong>{order.trackingCode}</strong></div>
        <div><span>Tổng thanh toán</span><strong>{formatMoney(order.total)}</strong></div>
        <div><span>Phương thức</span><strong>{order.paymentMethod === "cod" ? "Thanh toán khi nhận" : order.paymentMethod === "bank" ? "Chuyển khoản" : "Ví điện tử / QR"}</strong></div>
      </div>
      {order.paymentMethod !== "cod" && (
        <div className="bank-note">
          <strong>Thông tin thanh toán mẫu</strong>
          <p>Ngân hàng NOVA · STK 0000 1234 5678 · Nội dung: {order.id}</p>
        </div>
      )}
      <div className="success-actions">
        <Link className="button button--dark" to={`/tra-cuu`}>Theo dõi đơn hàng</Link>
        <Link className="button button--outline" to="/cua-hang">Tiếp tục mua sắm</Link>
      </div>
      <p className="success-help">Cần hỗ trợ? Gọi <a href="tel:19000000">1900 0000</a> hoặc gửi email hello@novawear.vn</p>
    </div>
  );
}
