import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../services/api";
import { formatDate, formatMoney } from "../config/site";
import { useShop } from "../context/ShopContext";
import { ErrorState, SmartImage } from "../components/Common";

const labels = { requested: "Đã tiếp nhận", approved: "Đã duyệt", receiving: "Chờ nhận hàng", completed: "Hoàn tất", rejected: "Từ chối" };

export default function ReturnsPage() {
  const { user, notify, integrations } = useShop();
  const [orders, setOrders] = useState([]); const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState(""); const [type, setType] = useState("exchange");
  const [selectedItems, setSelectedItems] = useState([]); const [reason, setReason] = useState("");
  const [proofImages, setProofImages] = useState([]); const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    try {
      const [history, returns] = await Promise.all([api.get("/orders/my"), api.get("/returns/my")]);
      const delivered = history.data.filter((order) => order.status === "delivered");
      setOrders(delivered); setRequests(returns.data); setSelectedId((current) => current || delivered[0]?.id || "");
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [user]);
  useEffect(() => { load(); }, [load]);
  const order = useMemo(() => orders.find((item) => item.id === selectedId), [orders, selectedId]);
  if (!user) return <Navigate to="/dang-nhap" state={{ from: "/doi-tra" }} replace />;
  const toggle = (line) => {
    const key = `${line.productId}-${line.size}-${line.color}`;
    setSelectedItems((current) => current.some((item) => item.key === key)
      ? current.filter((item) => item.key !== key)
      : [...current, { key, productId: line.productId, size: line.size, color: line.color, quantity: 1 }]);
  };
  const submit = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const result = await api.post("/returns", { orderId: selectedId, type, reason, items: selectedItems, proofImages });
      notify(result.message); setSelectedItems([]); setReason(""); setProofImages([]); load();
    } catch (e) { notify(e.message, "error"); } finally { setSaving(false); }
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
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };
  return <main className="returns-page">
    <header className="returns-hero"><div><p className="eyebrow">NOVA CARE</p><h1>Đổi trả rõ ràng,<br />theo dõi dễ dàng.</h1><p>Gửi yêu cầu cho đơn đã nhận trong vòng 30 ngày. Đội ngũ NOVAWEAR sẽ cập nhật từng bước ngay tại đây.</p></div><div><span>01</span><p>Chọn đơn và sản phẩm</p><span>02</span><p>Gửi lý do đổi trả</p><span>03</span><p>Theo dõi kết quả</p></div></header>
    <div className="returns-shell">
      <section className="returns-form-card">
        <div className="section-heading"><div><p className="eyebrow">Yêu cầu mới</p><h2>Sản phẩm cần hỗ trợ</h2></div><Link to="/tai-khoan">← Tài khoản</Link></div>
        {loading && <div className="skeleton skeleton--panel" />}{error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && orders.length === 0 && <div className="inline-empty"><h3>Chưa có đơn đủ điều kiện</h3><p>Yêu cầu đổi trả chỉ áp dụng sau khi đơn đã giao thành công.</p><Link className="button button--dark" to="/cua-hang">Tiếp tục mua sắm</Link></div>}
        {!loading && !error && order && <form onSubmit={submit}>
          <label className="field"><span>Đơn hàng đã nhận</span><select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setSelectedItems([]); }}>{orders.map((item) => <option value={item.id} key={item.id}>{item.id} · {formatDate(item.createdAt)} · {formatMoney(item.total)}</option>)}</select></label>
          <div className="return-choice"><button className={type === "exchange" ? "is-active" : ""} onClick={() => setType("exchange")} type="button"><strong>Đổi sản phẩm</strong><span>Đổi size hoặc màu phù hợp hơn</span></button><button className={type === "return" ? "is-active" : ""} onClick={() => setType("return")} type="button"><strong>Trả hàng</strong><span>Nhận lại tiền sau khi kiểm tra</span></button></div>
          <div className="return-product-list">{order.items.map((line) => { const key = `${line.productId}-${line.size}-${line.color}`; const checked = selectedItems.some((item) => item.key === key); return <button className={checked ? "is-selected" : ""} onClick={() => toggle(line)} type="button" key={key}><i>{checked ? "✓" : ""}</i><SmartImage src={line.image} alt={line.name} /><span><strong>{line.name}</strong><small>{line.color} · Size {line.size} · Số lượng {line.quantity}</small></span><b>{formatMoney(line.price)}</b></button>; })}</div>
          <label className="field"><span>Lý do đổi trả</span><textarea rows={4} required minLength={5} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mô tả tình trạng sản phẩm hoặc size/màu bạn muốn đổi..." /></label>
          {integrations.uploads && <label className="field"><span>Ảnh tình trạng sản phẩm (tối đa 5 ảnh)</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={uploading || proofImages.length >= 5} onChange={uploadProof} /></label>}
          {proofImages.length > 0 && <div className="return-proof-images">{proofImages.map((src) => <figure key={src}><SmartImage src={src} alt="Ảnh tình trạng sản phẩm" /><button type="button" onClick={() => setProofImages((current) => current.filter((item) => item !== src))}>Xóa</button></figure>)}</div>}
          <button className="button button--dark" disabled={saving || !selectedItems.length} type="submit">{saving ? "Đang gửi..." : "Gửi yêu cầu đổi trả →"}</button>
        </form>}
      </section>
      <aside className="returns-history"><div className="section-heading"><div><p className="eyebrow">Theo dõi</p><h2>Yêu cầu của bạn</h2></div></div>{requests.length ? requests.map((item) => <article key={item.id}><header><strong>{item.id}</strong><span>{labels[item.status]}</span></header><p>Đơn {item.orderId} · {item.type === "exchange" ? "Đổi sản phẩm" : "Trả hàng"}</p><footer><small>{formatDate(item.createdAt)}</small><b>{formatMoney(item.refundAmount)}</b></footer></article>) : <div className="inline-empty"><p>Chưa có yêu cầu nào.</p></div>}</aside>
    </div>
  </main>;
}
