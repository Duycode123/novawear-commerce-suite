import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { formatDate, formatMoney } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, Modal, PageHeader } from "../components/Ui";

const blank = {
  code: "",
  type: "percent",
  value: 10,
  minOrder: 0,
  maxDiscount: 0,
  active: true,
  startsAt: "",
  expiresAt: "",
  usageLimit: 0,
};

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function couponState(item) {
  const now = new Date();
  if (!item.active) return { label: "Tạm dừng", tone: "neutral" };
  if (new Date(item.startsAt || 0) > now) return { label: "Đã lên lịch", tone: "blue" };
  if (new Date(item.expiresAt) <= now) return { label: "Hết hạn", tone: "neutral" };
  if (Number(item.usageLimit || 0) > 0 && Number(item.usedCount || 0) >= Number(item.usageLimit)) {
    return { label: "Hết lượt", tone: "neutral" };
  }
  return { label: "Đang chạy", tone: "green" };
}

export default function CouponsPage() {
  const { notify } = useAdmin();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems((await api.get("/admin/coupons")).data); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (item = null) => {
    setEditing(item);
    setForm(item ? {
      ...item,
      startsAt: toLocalDateTimeInput(item.startsAt),
      expiresAt: toLocalDateTimeInput(item.expiresAt),
    } : { ...blank });
  };
  const save = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        value: Number(form.value),
        minOrder: Number(form.minOrder),
        maxDiscount: Number(form.maxDiscount),
        usageLimit: Number(form.usageLimit),
        startsAt: new Date(form.startsAt || Date.now()).toISOString(),
        expiresAt: new Date(form.expiresAt).toISOString(),
      };
      const result = editing ? await api.put(`/admin/coupons/${editing.code}`, payload) : await api.post("/admin/coupons", payload);
      notify(result.message); setEditing(null); setForm(null); load();
    } catch (requestError) { notify(requestError.message, "error"); }
  };
  const remove = async (item) => {
    if (!window.confirm(`Xóa mã ${item.code}?`)) return;
    try { const result = await api.delete(`/admin/coupons/${item.code}`); notify(result.message); load(); }
    catch (requestError) { notify(requestError.message, "error"); }
  };

  return <div>
    <PageHeader eyebrow="Growth & promotion" title="Mã ưu đãi" copy="Tạo, lên lịch và kiểm soát toàn bộ mã được dùng tại cửa hàng." actions={<button className="ops-primary-button" onClick={() => open()} type="button">＋ Tạo mã mới</button>} />
    <section className="ops-mini-stats">
      <div><span>Tổng số mã</span><strong>{items.length}</strong></div>
      <div><span>Đang hoạt động</span><strong>{items.filter((item) => couponState(item).label === "Đang chạy").length}</strong></div>
      <div><span>Sắp hết hạn</span><strong>{items.filter((item) => new Date(item.expiresAt) > new Date() && new Date(item.expiresAt) - new Date() < 7 * 86400000).length}</strong></div>
      <div><span>Đã tạm dừng</span><strong>{items.filter((item) => !item.active).length}</strong></div>
    </section>
    <section className="ops-panel ops-list-panel">
      {loading && <Loading rows={5} />}{error && <ErrorPanel message={error} onRetry={load} />}
      {!loading && !error && items.length > 0 && <div className="ops-table-wrap"><table className="ops-table">
        <thead><tr><th>Mã</th><th>Loại</th><th>Giá trị</th><th>Đơn tối thiểu</th><th>Thời gian</th><th>Lượt dùng</th><th>Trạng thái</th><th /></tr></thead>
        <tbody>{items.map((item) => {
          const state = couponState(item);
          return <tr key={item.code}>
          <td><code className="ops-code-chip">{item.code}</code></td>
          <td>{item.type === "percent" ? "Giảm theo %" : item.type === "shipping" ? "Phí vận chuyển" : "Giảm cố định"}</td>
          <td><strong>{item.type === "percent" ? `${item.value}%` : formatMoney(item.value)}</strong></td>
          <td>{formatMoney(item.minOrder)}</td>
          <td>{item.startsAt && new Date(item.startsAt) > new Date() ? `Từ ${formatDate(item.startsAt, true)}` : `Đến ${formatDate(item.expiresAt, true)}`}</td>
          <td>{Number(item.usageLimit || 0) > 0 ? `${Number(item.usedCount || 0)} / ${item.usageLimit}` : `${Number(item.usedCount || 0)} / Không giới hạn`}</td>
          <td><span className={`ops-status ops-status--${state.tone}`}>{state.label}</span></td>
          <td><div className="ops-row-actions"><button onClick={() => open(item)} type="button">Sửa</button><button className="danger" onClick={() => remove(item)} type="button">×</button></div></td>
        </tr>;
        })}</tbody>
      </table></div>}
      {!loading && !error && !items.length && <Empty title="Chưa có mã ưu đãi" copy="Tạo mã đầu tiên để hiển thị trên trang Ưu đãi." />}
    </section>
    <Modal open={Boolean(form)} title={editing ? `Chỉnh sửa ${editing.code}` : "Tạo mã ưu đãi"} onClose={() => { setEditing(null); setForm(null); }}>
      {form && <form className="ops-simple-form" onSubmit={save}>
        <label className="ops-field"><span>Mã ưu đãi</span><input required minLength={3} disabled={Boolean(editing)} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></label>
        <div className="ops-form-grid">
          <label className="ops-field"><span>Loại giảm</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="percent">Phần trăm</option><option value="fixed">Số tiền</option><option value="shipping">Vận chuyển</option></select></label>
          <label className="ops-field"><span>Giá trị</span><input type="number" min="0" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></label>
          <label className="ops-field"><span>Đơn tối thiểu</span><input type="number" min="0" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} /></label>
          <label className="ops-field"><span>Giảm tối đa</span><input type="number" min="0" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} /></label>
          <label className="ops-field"><span>Bắt đầu</span><input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
          <label className="ops-field"><span>Kết thúc</span><input type="datetime-local" required value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></label>
          <label className="ops-field ops-field--wide"><span>Giới hạn lượt dùng (0 = không giới hạn)</span><input type="number" min="0" step="1" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} /></label>
        </div>
        <label className="ops-check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><span>Cho phép khách hàng sử dụng mã</span></label>
        <div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={() => { setEditing(null); setForm(null); }}>Hủy</button><button className="ops-primary-button" type="submit">Lưu mã ưu đãi</button></div>
      </form>}
    </Modal>
  </div>;
}
