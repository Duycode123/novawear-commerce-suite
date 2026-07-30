import React, { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { formatMoney, PAYMENT_STATUS } from "../config/site";
import { api } from "../services/api";

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const order = state?.order;
  const [copied, setCopied] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(order?.paymentStatus || "pending");
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    if (!order || order.paymentMethod !== "bank") return;
    api.get(`/payments/sepay/orders/${encodeURIComponent(order.id)}/checkout?trackingCode=${encodeURIComponent(order.trackingCode)}`)
      .then((result) => setPaymentDetails(result.data))
      .catch(() => setPaymentDetails(null));
  }, [order]);

  useEffect(() => {
    if (!order || order.paymentMethod === "cod" || ["paid", "expired", "cancelled", "failed"].includes(paymentStatus)) return undefined;
    const controller = new AbortController();
    const checkPayment = async () => {
      try {
        const result = await api.get(
          `/payments/sepay/orders/${encodeURIComponent(order.id)}/status?trackingCode=${encodeURIComponent(order.trackingCode)}`,
          { signal: controller.signal },
        );
        if (result.data?.paymentStatus) setPaymentStatus(result.data.paymentStatus);
      } catch (error) {
        if (error.name !== "AbortError") return;
      }
    };
    checkPayment();
    const timer = window.setInterval(checkPayment, 4000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [order, paymentStatus]);

  if (!order) return <Navigate to="/" replace />;

  const transferContent = order.paymentCode || order.trackingCode || order.id.replace(/[^a-zA-Z0-9]/g, "");
  const copy = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(""), 1800);
    } catch (_error) {
      setCopied("");
    }
  };

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
        <section className={`sepay-payment-card ${paymentStatus === "paid" ? "sepay-payment-card--paid" : ""} ${["expired", "cancelled", "failed"].includes(paymentStatus) ? "sepay-payment-card--failed" : ""}`}>
          <div className="sepay-payment-state" role="status">
            <span>{paymentStatus === "paid" ? "✓" : ["expired", "cancelled", "failed"].includes(paymentStatus) ? "!" : ""}</span>
            <div>
              <strong>{PAYMENT_STATUS[paymentStatus]?.label || "Đang chờ thanh toán"}</strong>
              <small>{paymentStatus === "paid" ? "Đơn hàng đã được tự động xác nhận." : ["expired", "cancelled", "failed"].includes(paymentStatus) ? "Đơn không còn nhận chuyển khoản. Tồn kho đã được giải phóng; vui lòng đặt đơn mới." : "Trang sẽ tự cập nhật ngay khi SePay báo tiền về."}</small>
            </div>
          </div>
          {!['expired', 'cancelled', 'failed'].includes(paymentStatus) && <div className="sepay-payment-card__qr">
            <span>Thanh toán qua <b>SePay</b></span>
            {paymentDetails?.qrUrl
              ? <img src={paymentDetails.qrUrl} alt={`Mã QR thanh toán cho đơn ${order.id}`} />
              : <div className="skeleton skeleton--panel" aria-label="Đang tải mã QR" />}
            <small>Quét bằng ứng dụng ngân hàng</small>
          </div>}
          {!['expired', 'cancelled', 'failed'].includes(paymentStatus) && <div className="sepay-payment-card__info">
            <p className="eyebrow">Chờ thanh toán</p>
            <h2>{formatMoney(order.total)}</h2>
            <div><span>Ngân hàng</span><strong>{paymentDetails?.bankCode || "Đang tải..."}</strong></div>
            <div><span>Số tài khoản</span><strong>{paymentDetails?.accountNumber || "Đang tải..."}</strong>{paymentDetails?.accountNumber && <button type="button" onClick={() => copy(paymentDetails.accountNumber, "account")}>{copied === "account" ? "Đã chép" : "Sao chép"}</button>}</div>
            <div><span>Chủ tài khoản</span><strong>{paymentDetails?.accountName || "Đang tải..."}</strong></div>
            <div><span>Nội dung chuyển khoản</span><strong>{transferContent}</strong><button type="button" onClick={() => copy(transferContent, "content")}>{copied === "content" ? "Đã chép" : "Sao chép"}</button></div>
            <p className="sepay-payment-card__notice">Sau khi chuyển khoản, hệ thống sẽ tự động xác nhận trong khoảng 1–5 phút.</p>
          </div>}
        </section>
      )}
      <div className="success-actions">
        <Link className="button button--dark" to={`/tra-cuu`}>Theo dõi đơn hàng</Link>
        <Link className="button button--outline" to="/cua-hang">Tiếp tục mua sắm</Link>
      </div>
      <p className="success-help">Cần hỗ trợ? Gọi <a href="tel:19000000">1900 0000</a> hoặc gửi email hello@novawear.vn</p>
    </div>
  );
}
