import React, { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { formatMoney, PAYMENT_STATUS } from "../config/site";
import { api } from "../services/api";

const ORDER_HANDOFF_KEY = "novawear_checkout_order";
const TERMINAL_PAYMENT_STATUSES = ["paid", "expired", "cancelled", "failed"];

function readOrderHandoff() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(ORDER_HANDOFF_KEY) || "null");
    return stored?.id && stored?.trackingCode ? stored : null;
  } catch (_error) {
    sessionStorage.removeItem(ORDER_HANDOFF_KEY);
    return null;
  }
}

function secondsUntil(value) {
  if (!value) return null;
  const expiresAt = new Date(value || 0).getTime();
  return Number.isFinite(expiresAt) ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)) : null;
}

function formatCountdown(totalSeconds) {
  if (totalSeconds === null) return "";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const [order] = useState(() => state?.order || readOrderHandoff());
  const [copied, setCopied] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(order?.paymentStatus || "pending");
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(order?.paymentMethod === "bank");
  const [paymentError, setPaymentError] = useState("");
  const [paymentReload, setPaymentReload] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(order?.paymentExpiresAt));

  useEffect(() => {
    if (!order) return;
    try {
      sessionStorage.setItem(ORDER_HANDOFF_KEY, JSON.stringify({
        id: order.id,
        trackingCode: order.trackingCode,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus,
        paymentCode: order.paymentCode,
        paymentExpiresAt: order.paymentExpiresAt,
      }));
    } catch (_storageError) {
      // The page continues to work from route state when storage is unavailable.
    }
  }, [order, paymentStatus]);

  useEffect(() => {
    if (!order || order.paymentMethod !== "bank") return;
    const controller = new AbortController();
    setPaymentLoading(true);
    setPaymentError("");
    api.get(
      `/payments/sepay/orders/${encodeURIComponent(order.id)}/checkout?trackingCode=${encodeURIComponent(order.trackingCode)}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!result.data?.qrUrl) throw new Error("SePay chưa trả về mã QR.");
        setPaymentDetails(result.data);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setPaymentDetails(null);
        setPaymentError(error.message || "Chưa tải được mã QR từ SePay.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPaymentLoading(false);
      });
    return () => controller.abort();
  }, [order, paymentReload]);

  useEffect(() => {
    if (!order?.paymentExpiresAt || TERMINAL_PAYMENT_STATUSES.includes(paymentStatus)) return undefined;
    const updateCountdown = () => {
      const remaining = secondsUntil(order.paymentExpiresAt);
      setSecondsLeft(remaining);
      if (remaining === 0) setPaymentStatus("expired");
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [order, paymentStatus]);

  useEffect(() => {
    if (!order || order.paymentMethod === "cod" || TERMINAL_PAYMENT_STATUSES.includes(paymentStatus)) return undefined;
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

  const paymentFailed = ["expired", "cancelled", "failed"].includes(paymentStatus);
  const paymentPaid = paymentStatus === "paid";
  const paymentPending = order.paymentMethod === "bank" && paymentStatus !== "paid" && !paymentFailed;
  const transferContent = order.paymentCode || order.trackingCode || String(order.id).replace(/[^a-zA-Z0-9]/g, "");
  const successContent = paymentPending
    ? {
      eyebrow: "Đơn hàng đã tạo · Chờ thanh toán",
      title: <>Thanh toán đơn hàng.<br />Quét QR để tiếp tục.</>,
      description: "Trạng thái chỉ chuyển sang “Đã thanh toán” sau khi SePay xác nhận tiền đã về tài khoản.",
      symbol: "₫",
      modifier: "success-mark--pending",
    }
    : paymentPaid
      ? {
        eyebrow: "Thanh toán thành công",
        title: <>Đơn hàng đã được xác nhận.<br />Cảm ơn bạn!</>,
        description: "Chúng tôi đang chuẩn bị đơn và sẽ cập nhật từng chặng giao hàng trong tài khoản của bạn.",
        symbol: "✓",
        modifier: "success-mark--paid",
      }
      : paymentFailed
        ? {
          eyebrow: "Thanh toán chưa hoàn tất",
          title: <>Phiên thanh toán<br />đã kết thúc.</>,
          description: "Đơn không còn giữ hàng. Bạn có thể quay lại cửa hàng và tạo một đơn mới.",
          symbol: "!",
          modifier: "success-mark--failed",
        }
        : {
          eyebrow: "Đặt hàng thành công",
          title: <>Đơn hàng đã được ghi nhận.<br />Cảm ơn bạn!</>,
          description: "Chúng tôi đang chuẩn bị đơn và sẽ cập nhật từng chặng giao hàng trong tài khoản của bạn.",
          symbol: "✓",
          modifier: "success-mark--paid",
        };
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
      <div className={`success-mark ${successContent.modifier}`}><span>{successContent.symbol}</span></div>
      <p className="eyebrow">{successContent.eyebrow}</p>
      <h1>{successContent.title}</h1>
      <p>{successContent.description}</p>
      <div className="success-order">
        <div><span>Mã đơn hàng</span><strong>{order.id}</strong></div>
        <div><span>Mã tra cứu</span><strong>{order.trackingCode}</strong></div>
        <div><span>Tổng thanh toán</span><strong>{formatMoney(order.total)}</strong></div>
        <div><span>Phương thức</span><strong>{order.paymentMethod === "cod" ? "Thanh toán khi nhận" : order.paymentMethod === "bank" ? "Chuyển khoản" : "Ví điện tử / QR"}</strong></div>
      </div>
      {order.paymentMethod !== "cod" && (
        <section className={`sepay-payment-card ${paymentStatus === "paid" ? "sepay-payment-card--paid" : ""} ${paymentFailed ? "sepay-payment-card--failed" : ""}`}>
          <div className="sepay-payment-state" role="status">
            <span>{paymentStatus === "paid" ? "✓" : paymentFailed ? "!" : "₫"}</span>
            <div>
              <strong>{PAYMENT_STATUS[paymentStatus]?.label || "Đang chờ thanh toán"}</strong>
              <small>{paymentStatus === "paid" ? "Đơn hàng đã được tự động xác nhận." : paymentFailed ? "Đơn không còn nhận chuyển khoản. Tồn kho đã được giải phóng; vui lòng đặt đơn mới." : `Trang tự cập nhật khi SePay báo tiền về${secondsLeft !== null ? ` · Còn ${formatCountdown(secondsLeft)}` : ""}.`}</small>
            </div>
          </div>
          {!paymentFailed && <div className="sepay-payment-card__qr">
            <span>Thanh toán qua <b>SePay</b></span>
            {paymentLoading && <div className="skeleton skeleton--panel" aria-label="Đang tải mã QR" />}
            {!paymentLoading && paymentDetails?.qrUrl && (
              <img
                src={paymentDetails.qrUrl}
                alt={`Mã QR thanh toán cho đơn ${order.id}`}
                onError={() => {
                  setPaymentDetails(null);
                  setPaymentError("Ảnh QR chưa tải được. Vui lòng thử lại.");
                }}
              />
            )}
            {!paymentLoading && paymentError && (
              <div className="sepay-payment-card__error" role="alert">
                <strong>Chưa hiển thị được mã QR</strong>
                <small>{paymentError}</small>
                <button type="button" onClick={() => setPaymentReload((current) => current + 1)}>Tải lại QR</button>
              </div>
            )}
            <small>Quét bằng ứng dụng ngân hàng</small>
          </div>}
          {!paymentFailed && <div className="sepay-payment-card__info">
            <p className="eyebrow">Chờ thanh toán</p>
            <h2>{formatMoney(order.total)}</h2>
            <div><span>Ngân hàng</span><strong>{paymentDetails?.bankCode || (paymentError ? "Chưa tải được" : "Đang tải...")}</strong></div>
            <div><span>Số tài khoản</span><strong>{paymentDetails?.accountNumber || (paymentError ? "Chưa tải được" : "Đang tải...")}</strong>{paymentDetails?.accountNumber && <button type="button" onClick={() => copy(paymentDetails.accountNumber, "account")}>{copied === "account" ? "Đã chép" : "Sao chép"}</button>}</div>
            <div><span>Chủ tài khoản</span><strong>{paymentDetails?.accountName || (paymentError ? "Chưa tải được" : "Đang tải...")}</strong></div>
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
