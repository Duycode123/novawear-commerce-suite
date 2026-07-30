import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { formatMoney } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, Modal, PageHeader, ProductImage } from "../components/Ui";

export default function InventoryPage() {
  const { notify, user } = useAdmin();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [selected, setSelected] = useState(null);
  const [adjustment, setAdjustment] = useState({ quantity: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (level !== "all") query.set("level", level);
      const result = await api.get(`/admin/inventory?${query.toString()}`);
      setItems(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [search, level]);

  useEffect(() => {
    const timer = window.setTimeout(load, 220);
    return () => window.clearTimeout(timer);
  }, [load]);

  const summary = useMemo(() => ({
    units: items.reduce((sum, item) => sum + item.stock, 0),
    value: items.reduce((sum, item) => sum + item.retailValue, 0),
    low: items.filter((item) => item.status === "low").length,
    out: items.filter((item) => item.status === "out").length,
  }), [items]);

  const submitAdjustment = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api.post("/admin/inventory/adjust", {
        productId: selected.id,
        quantity: Number(adjustment.quantity),
        reason: adjustment.reason,
      });
      notify(result.message);
      setSelected(null);
      setAdjustment({ quantity: "", reason: "" });
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Stock control" title="Tồn kho" copy="Theo dõi số lượng, giá trị và điều chỉnh chênh lệch kho." />
      <section className="ops-inventory-summary">
        <div><span>Tổng đơn vị</span><strong>{summary.units}</strong><small>trên {items.length} mã hàng</small></div>
        <div><span>Giá trị bán lẻ</span><strong>{formatMoney(summary.value)}</strong><small>theo giá hiện tại</small></div>
        <div className="is-warning"><span>Sắp hết</span><strong>{summary.low}</strong><small>cần nhập thêm</small></div>
        <div className="is-danger"><span>Hết hàng</span><strong>{summary.out}</strong><small>đang không thể bán</small></div>
      </section>
      <section className="ops-panel ops-list-panel">
        <div className="ops-list-toolbar">
          <div className="ops-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc SKU..." /></div>
          <select value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">Tất cả mức tồn</option><option value="healthy">An toàn</option><option value="low">Sắp hết</option><option value="out">Hết hàng</option></select>
          <span>{items.length} mã hàng</span>
        </div>
        {loading && <Loading rows={6} />}
        {error && <ErrorPanel message={error} onRetry={load} />}
        {!loading && !error && items.length > 0 && (
          <div className="ops-table-wrap">
            <table className="ops-table ops-inventory-table">
              <thead><tr><th>Sản phẩm</th><th>SKU</th><th>Tồn hiện tại</th><th>Mức tồn</th><th>Giá vốn</th><th>Giá trị bán lẻ</th><th /></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><div className="ops-product-cell"><ProductImage src={item.image} alt={item.name} /><strong>{item.name}</strong></div></td>
                    <td><code>{item.sku}</code></td>
                    <td><strong className="inventory-quantity">{item.stock}</strong></td>
                    <td><span className={`inventory-level inventory-level--${item.status}`}>{item.status === "healthy" ? "An toàn" : item.status === "low" ? "Sắp hết" : "Hết hàng"}</span></td>
                    <td>{formatMoney(item.cost)}</td>
                    <td><strong>{formatMoney(item.retailValue)}</strong></td>
                    <td>{user?.role === "admin" ? <button className="ops-link-button" type="button" onClick={() => setSelected(item)}>Điều chỉnh</button> : <span className="ops-muted">Chỉ xem</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && !items.length && <Empty title="Không có mặt hàng" copy="Thử thay đổi từ khóa hoặc bộ lọc." />}
      </section>

      <Modal open={Boolean(selected)} title="Điều chỉnh tồn kho" subtitle={selected ? `${selected.name} · Hiện có ${selected.stock}` : ""} onClose={() => setSelected(null)}>
        <form className="ops-simple-form" onSubmit={submitAdjustment}>
          <div className="ops-adjust-hint"><span>＋ số dương để nhập thêm</span><span>− số âm để giảm kho</span></div>
          <label className="ops-field"><span>Số lượng điều chỉnh *</span><input type="number" required value={adjustment.quantity} onChange={(event) => setAdjustment((current) => ({ ...current, quantity: event.target.value }))} placeholder="Ví dụ: 10 hoặc -2" /></label>
          <label className="ops-field"><span>Lý do</span><textarea rows={3} value={adjustment.reason} onChange={(event) => setAdjustment((current) => ({ ...current, reason: event.target.value }))} placeholder="Nhập hàng, kiểm kê, hàng lỗi..." /></label>
          {selected && adjustment.quantity && <div className="ops-adjust-result"><span>Tồn sau điều chỉnh</span><strong>{selected.stock + Number(adjustment.quantity || 0)}</strong></div>}
          <div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={() => setSelected(null)}>Hủy</button><button className="ops-primary-button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Xác nhận điều chỉnh"}</button></div>
        </form>
      </Modal>
    </div>
  );
}
