import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../services/api";
import { formatDate, formatMoney, RETURN_STATUS } from "../config/site";
import { useShop } from "../context/ShopContext";
import { ErrorState, SmartImage } from "../components/Common";

export default function ReturnsPage() {
  const { user, notify, integrations } = useShop();
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [productDetails, setProductDetails] = useState({});
  const [selectedId, setSelectedId] = useState("");
  const [type, setType] = useState("exchange");
  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState("");
  const [proofImages, setProofImages] = useState([]);
  const [expandedRequest, setExpandedRequest] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!user) return;
    if (!silent) setLoading(true);
    setError("");
    try {
      const [history, returns] = await Promise.all([api.get("/orders/my"), api.get("/returns/my")]);
      const delivered = history.data.filter((order) => order.status === "delivered"
        && Date.now() - new Date(order.deliveredAt || order.updatedAt).getTime() <= 30 * 86400000);
      setOrders(delivered);
      setRequests(returns.data);
      setSelectedId((current) => current || delivered[0]?.id || "");
    } catch (requestError) {
      if (!silent) setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setInterval(() => load({ silent: true }), 15000);
    return () => window.clearInterval(timer);
  }, [user, load]);

  const order = useMemo(() => orders.find((item) => item.id === selectedId), [orders, selectedId]);

  useEffect(() => {
    if (!order) return;
    let active = true;
    Promise.all(order.items.map((line) => api.get(`/products/${encodeURIComponent(line.productId)}`)
      .then((result) => [line.productId, result.data])
      .catch(() => [line.productId, null])))
      .then((pairs) => {
        if (active) setProductDetails(Object.fromEntries(pairs));
      });
    return () => { active = false; };
  }, [order]);

  if (!user) return <Navigate to="/dang-nhap" state={{ from: "/doi-tra" }} replace />;

  const toggle = (line) => {
    const key = `${line.productId}-${line.size}-${line.color}`;
    setSelectedItems((current) => current.some((item) => item.key === key)
      ? current.filter((item) => item.key !== key)
      : [...current, {
        key,
        productId: line.productId,
        size: line.size,
        color: line.color,
        quantity: 1,
        desiredSize: "",
        desiredColor: "",
        maxQuantity: line.quantity,
        name: line.name,
      }]);
  };

  const updateSelectedItem = (key, changes) => {
    setSelectedItems((current) => current.map((item) => item.key === key ? { ...item, ...changes } : item));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (type === "exchange" && selectedItems.some((item) => !item.desiredSize || !item.desiredColor
      || (item.desiredSize === item.size && item.desiredColor === item.color))) {
      notify("Hãy chọn size hoặc màu mới cho từng sản phẩm cần đổi.", "error");
      return;
    }
    setSaving(true);
    try {
      const result = await api.post("/returns", {
        orderId: selectedId,
        type,
        reason,
        items: selectedItems.map(({ key, maxQuantity, name, ...item }) => item),
        proofImages,
      });
      notify(result.message);
      setSelectedItems([]);
      setReason("");
      setProofImages([]);
      setExpandedRequest(result.data.id);
      await load({ silent: true });
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const cancelRequest = async (request) => {
    setSaving(true);
    try {
      const result = await api.patch(`/returns/${request.id}/cancel`, {
        expectedVersion: request.version,
        reason: "Tôi không còn nhu cầu đổi trả sản phẩm.",
      });
      notify(result.message);
      await load({ silent: true });
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const uploadProof = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, Math.max(0, 5 - proofImages.length));
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const result = await api.upload("/uploads/return", file);
        uploaded.push(result.data.url);
      }
      setProofImages((current) => [...current, ...uploaded].slice(0, 5));
      notify("Đã tải ảnh tình trạng sản phẩm.");
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="returns-page">
      <header className="returns-hero"><div><p className="eyebrow">NOVA CARE</p><h1>Đổi trả rõ ràng,<br />theo dõi dễ dàng.</h1><p>Gửi yêu cầu cho đơn đã nhận trong vòng 30 ngày. Mỗi bước nhận hàng, kiểm tra và hoàn tiền đều được ghi lại.</p></div><div><span>01</span><p>Chọn đơn và sản phẩm</p><span>02</span><p>Gửi thông tin chính xác</p><span>03</span><p>Theo dõi xử lý hai chiều</p></div></header>
      <div className="returns-shell">
        <section className="returns-form-card">
          <div className="section-heading"><div><p className="eyebrow">Yêu cầu mới</p><h2>Sản phẩm cần hỗ trợ</h2></div><Link to="/tai-khoan?tab=orders">← Đơn hàng</Link></div>
          {loading && <div className="skeleton skeleton--panel" />}{error && <ErrorState message={error} onRetry={() => load()} />}
          {!loading && !error && orders.length === 0 && <div className="inline-empty"><h3>Chưa có đơn đủ điều kiện</h3><p>Yêu cầu đổi trả áp dụng trong 30 ngày sau khi giao thành công.</p><Link className="button button--dark" to="/cua-hang">Tiếp tục mua sắm</Link></div>}
          {!loading && !error && order && <form onSubmit={submit}>
            <label className="field"><span>Đơn hàng đã nhận</span><select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setSelectedItems([]); }}>{orders.map((item) => <option value={item.id} key={item.id}>{item.id} · {formatDate(item.createdAt)} · {formatMoney(item.total)}</option>)}</select></label>
            <div className="return-choice"><button className={type === "exchange" ? "is-active" : ""} onClick={() => setType("exchange")} type="button"><strong>Đổi sản phẩm</strong><span>Đổi sang size hoặc màu còn tồn kho</span></button><button className={type === "return" ? "is-active" : ""} onClick={() => setType("return")} type="button"><strong>Trả hàng</strong><span>Hoàn tiền sau khi kiểm tra đạt yêu cầu</span></button></div>
            <div className="return-product-list">{order.items.map((line) => { const key = `${line.productId}-${line.size}-${line.color}`; const checked = selectedItems.some((item) => item.key === key); return <button className={checked ? "is-selected" : ""} onClick={() => toggle(line)} type="button" key={key}><i>{checked ? "✓" : ""}</i><SmartImage src={line.image} alt={line.name} /><span><strong>{line.name}</strong><small>{line.color} · Size {line.size} · Số lượng {line.quantity}</small></span><b>{formatMoney(line.price)}</b></button>; })}</div>
            {selectedItems.length > 0 && <div className="return-selected-options">{selectedItems.map((item) => { const product = productDetails[item.productId]; return <article key={item.key}><strong>{item.name}</strong><label><span>Số lượng</span><select value={item.quantity} onChange={(event) => updateSelectedItem(item.key, { quantity: Number(event.target.value) })}>{Array.from({ length: item.maxQuantity }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1}</option>)}</select></label>{type === "exchange" && <><label><span>Size muốn đổi *</span><select value={item.desiredSize} onChange={(event) => updateSelectedItem(item.key, { desiredSize: event.target.value })}><option value="">Chọn size</option>{(product?.sizes || []).map((size) => <option value={size} key={size}>{size}</option>)}</select></label><label><span>Màu muốn đổi *</span><select value={item.desiredColor} onChange={(event) => updateSelectedItem(item.key, { desiredColor: event.target.value })}><option value="">Chọn màu</option>{(product?.colors || []).map((color) => <option value={color} key={color}>{color}</option>)}</select></label></>}</article>; })}</div>}
            <label className="field"><span>Lý do đổi trả *</span><textarea rows={4} required minLength={5} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Mô tả đúng tình trạng sản phẩm và nhu cầu hỗ trợ..." /></label>
            {integrations.uploads && <label className="field"><span>Ảnh tình trạng sản phẩm (tối đa 5 ảnh)</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={uploading || proofImages.length >= 5} onChange={uploadProof} /></label>}
            {proofImages.length > 0 && <div className="return-proof-images">{proofImages.map((src) => <figure key={src}><SmartImage src={src} alt="Ảnh tình trạng sản phẩm" /><button type="button" onClick={() => setProofImages((current) => current.filter((item) => item !== src))}>Xóa</button></figure>)}</div>}
            <button className="button button--dark" disabled={saving || !selectedItems.length} type="submit">{saving ? "Đang gửi..." : "Gửi yêu cầu đổi trả →"}</button>
          </form>}
        </section>
        <aside className="returns-history">
          <div className="section-heading"><div><p className="eyebrow">Theo dõi</p><h2>Yêu cầu của bạn</h2></div></div>
          {requests.length ? requests.map((item) => <article className={expandedRequest === item.id ? "is-expanded" : ""} key={item.id}><button className="return-history-summary" type="button" onClick={() => setExpandedRequest((current) => current === item.id ? "" : item.id)}><header><strong>{item.id}</strong><span>{RETURN_STATUS[item.status] || item.status}</span></header><p>Đơn {item.orderId} · {item.type === "exchange" ? "Đổi sản phẩm" : "Trả hàng"}</p><footer><small>{formatDate(item.createdAt)}</small><b>{item.type === "return" ? formatMoney(item.refundAmount) : "Xem tiến độ →"}</b></footer></button>{expandedRequest === item.id && <div className="return-history-detail"><div className="return-history-timeline">{(item.timeline || []).map((entry) => <div key={entry.id || `${entry.status}-${entry.at}`}><i>✓</i><span><strong>{entry.label || RETURN_STATUS[entry.status]}</strong>{entry.note && <p>{entry.note}</p>}<small>{entry.actorName || "Hệ thống NOVAWEAR"} · {formatDate(entry.at, { hour: "2-digit", minute: "2-digit" })}</small></span></div>)}</div>{item.type === "return" && <p><strong>Hoàn tiền:</strong> {item.refundStatus === "refunded" ? `Đã hoàn · ${item.refundReference}` : item.refundStatus === "pending" ? "Đang đối soát" : "Chờ kiểm tra sản phẩm"}</p>}{item.exchangeShipment?.trackingNumber && <p><strong>Giao sản phẩm đổi:</strong> {item.exchangeShipment.carrier} · {item.exchangeShipment.trackingNumber}</p>}{item.status === "requested" && <button type="button" disabled={saving} onClick={() => cancelRequest(item)}>Hủy yêu cầu</button>}</div>}</article>) : <div className="inline-empty"><p>Chưa có yêu cầu nào.</p></div>}
        </aside>
      </div>
    </div>
  );
}
