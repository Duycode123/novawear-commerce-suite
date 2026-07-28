import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { formatDate, formatMoney } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, Modal, PageHeader, Status } from "../components/Ui";

const emptyForm = { name: "", email: "", phone: "", address: "", tier: "Member", status: "active" };

export default function CustomersPage() {
  const { notify } = useAdmin();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.get(`/admin/customers?search=${encodeURIComponent(search)}`);
      setCustomers(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 220);
    return () => window.clearTimeout(timer);
  }, [load]);

  const summary = useMemo(() => ({
    revenue: customers.reduce((sum, item) => sum + item.totalSpent, 0),
    gold: customers.filter((item) => item.tier === "Gold").length,
    orders: customers.reduce((sum, item) => sum + item.orderCount, 0),
  }), [customers]);

  const open = (customer = null) => {
    setSelected(customer);
    setFormOpen(true);
    setForm(customer ? { ...customer } : emptyForm);
  };
  const close = () => {
    setSelected(null);
    setFormOpen(false);
    setForm(emptyForm);
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = selected
        ? await api.put(`/admin/customers/${selected.id}`, form)
        : await api.post("/admin/customers", form);
      notify(result.message);
      close();
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Customer relationship" title="Khách hàng" copy="Theo dõi hồ sơ, hạng thành viên và giá trị mua sắm." actions={<button className="ops-primary-button" type="button" onClick={() => open()}>＋ Thêm khách hàng</button>} />
      <section className="ops-mini-stats">
        <div><span>Tổng khách hàng</span><strong>{customers.length}</strong></div>
        <div><span>Hạng Gold</span><strong>{summary.gold}</strong></div>
        <div><span>Tổng đơn</span><strong>{summary.orders}</strong></div>
        <div><span>Giá trị mua</span><strong>{formatMoney(summary.revenue)}</strong></div>
      </section>
      <section className="ops-panel ops-list-panel">
        <div className="ops-list-toolbar"><div className="ops-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, email hoặc số điện thoại..." /></div><span>{customers.length} khách hàng</span></div>
        {loading && <Loading rows={6} />}
        {error && <ErrorPanel message={error} onRetry={load} />}
        {!loading && !error && customers.length > 0 && (
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead><tr><th>Khách hàng</th><th>Liên hệ</th><th>Hạng</th><th>Số đơn</th><th>Tổng chi tiêu</th><th>Ngày tham gia</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td><div className="ops-customer-cell"><span>{customer.name.charAt(0)}</span><div><strong>{customer.name}</strong><small>{customer.id}</small></div></div></td>
                    <td><strong>{customer.phone}</strong><small>{customer.email}</small></td>
                    <td><span className={`tier tier--${customer.tier.toLowerCase()}`}>{customer.tier}</span></td>
                    <td>{customer.orderCount}</td>
                    <td><strong>{formatMoney(customer.totalSpent)}</strong></td>
                    <td>{formatDate(customer.createdAt)}</td>
                    <td><Status value={customer.status} type="customer" /></td>
                    <td><button className="ops-link-button" type="button" onClick={() => open(customer)}>Chi tiết</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && !customers.length && <Empty title="Chưa có khách hàng" copy="Khách mới sẽ xuất hiện sau khi đặt hàng hoặc được thêm thủ công." />}
      </section>
      <Modal open={formOpen} title={selected ? "Hồ sơ khách hàng" : "Thêm khách hàng"} subtitle={selected?.id} onClose={close}>
        <form className="ops-simple-form" onSubmit={save}>
          <div className="ops-form-grid">
            <label className="ops-field ops-field--wide"><span>Họ và tên *</span><input required minLength={2} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="ops-field"><span>Số điện thoại *</span><input required value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="ops-field"><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
            <label className="ops-field ops-field--wide"><span>Địa chỉ</span><textarea rows={3} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></label>
            <label className="ops-field"><span>Hạng thành viên</span><select value={form.tier} onChange={(event) => setForm((current) => ({ ...current, tier: event.target.value }))}><option>Member</option><option>Silver</option><option>Gold</option></select></label>
            <label className="ops-field"><span>Trạng thái</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="active">Hoạt động</option><option value="inactive">Ngừng hoạt động</option></select></label>
          </div>
          {selected && <div className="ops-customer-insight"><div><span>Số đơn</span><strong>{selected.orderCount}</strong></div><div><span>Tổng chi tiêu</span><strong>{formatMoney(selected.totalSpent)}</strong></div></div>}
          <div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={close}>Hủy</button><button className="ops-primary-button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu hồ sơ"}</button></div>
        </form>
      </Modal>
    </div>
  );
}
