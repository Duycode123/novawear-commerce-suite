import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { formatDate, formatMoney } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, Modal, PageHeader, ProductImage } from "../components/Ui";

export default function PurchasesPage() {
  const { notify, user } = useAdmin();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ supplier: "", expectedDate: "", items: [{ productId: "", quantity: 1, unitCost: "" }] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [purchaseResult, productResult] = await Promise.all([
        api.get("/admin/purchase-orders"),
        api.get("/admin/products?status=active"),
      ]);
      setOrders(purchaseResult.data);
      setProducts(productResult.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateLine = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const addLine = () => setForm((current) => ({ ...current, items: [...current.items, { productId: "", quantity: 1, unitCost: "" }] }));
  const removeLine = (index) => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  const close = () => {
    setCreateOpen(false);
    setForm({ supplier: "", expectedDate: "", items: [{ productId: "", quantity: 1, unitCost: "" }] });
  };

  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api.post("/admin/purchase-orders", {
        supplier: form.supplier,
        expectedDate: form.expectedDate,
        items: form.items.map((item) => ({ ...item, quantity: Number(item.quantity), unitCost: Number(item.unitCost) })),
      });
      notify(result.message);
      close();
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const receive = async (order) => {
    if (!window.confirm(`Xác nhận đã nhận đủ hàng của phiếu ${order.id}? Tồn kho sẽ được cộng ngay.`)) return;
    try {
      const result = await api.patch(`/admin/purchase-orders/${order.id}/receive`, {});
      notify(result.message);
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Inbound logistics" title="Nhập hàng" copy="Tạo phiếu đặt nhà cung cấp và ghi nhận hàng về kho." actions={user?.role === "admin" ? <button className="ops-primary-button" type="button" onClick={() => setCreateOpen(true)}>＋ Tạo phiếu nhập</button> : null} />
      {loading && <Loading rows={5} />}
      {error && <ErrorPanel message={error} onRetry={load} />}
      {!loading && !error && orders.length > 0 && (
        <div className="ops-purchase-list">
          {orders.map((order) => (
            <article className="ops-purchase-card" key={order.id}>
              <header>
                <div><span>{order.id}</span><h2>{order.supplier}</h2><p>Tạo ngày {formatDate(order.createdAt)}</p></div>
                <span className={`purchase-status purchase-status--${order.status}`}>{order.status === "received" ? "Đã nhập kho" : "Đang chờ hàng"}</span>
              </header>
              <div className="ops-purchase-items">
                {order.items.map((line) => (
                  <div key={line.productId}>
                    <ProductImage src={line.product?.image} alt={line.product?.name || ""} />
                    <span><strong>{line.product?.name || line.productId}</strong><small>{line.quantity} × {formatMoney(line.unitCost)}</small></span>
                    <b>{formatMoney(line.quantity * line.unitCost)}</b>
                  </div>
                ))}
              </div>
              <footer>
                <div><span>Ngày dự kiến</span><strong>{order.expectedDate ? formatDate(order.expectedDate) : "Chưa đặt"}</strong></div>
                <div><span>Tổng giá trị</span><strong>{formatMoney(order.total)}</strong></div>
                {order.status !== "received"
                  ? user?.role === "admin"
                    ? <button className="ops-primary-button" type="button" onClick={() => receive(order)}>Nhận hàng vào kho →</button>
                    : <span className="ops-muted">Chờ quản trị viên xác nhận</span>
                  : <span className="purchase-received">✓ {formatDate(order.receivedAt, true)}</span>}
              </footer>
            </article>
          ))}
        </div>
      )}
      {!loading && !error && !orders.length && <Empty title="Chưa có phiếu nhập" copy="Tạo phiếu đầu tiên để bổ sung tồn kho." />}

      <Modal open={createOpen} title="Tạo phiếu nhập hàng" subtitle="Đơn đặt từ nhà cung cấp" onClose={close} wide>
        <form className="ops-purchase-form" onSubmit={create}>
          <div className="ops-form-grid">
            <label className="ops-field"><span>Nhà cung cấp *</span><input required value={form.supplier} onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))} placeholder="Tên nhà cung cấp" /></label>
            <label className="ops-field"><span>Ngày dự kiến nhận</span><input type="date" value={form.expectedDate} onChange={(event) => setForm((current) => ({ ...current, expectedDate: event.target.value }))} /></label>
          </div>
          <div className="ops-purchase-form__lines">
            <div className="ops-line-head"><h3>Sản phẩm nhập</h3><button type="button" onClick={addLine}>＋ Thêm dòng</button></div>
            {form.items.map((line, index) => (
              <div className="ops-purchase-line" key={index}>
                <label><span>Sản phẩm</span><select required value={line.productId} onChange={(event) => {
                  const product = products.find((item) => item.id === event.target.value);
                  updateLine(index, "productId", event.target.value);
                  if (product) updateLine(index, "unitCost", product.cost);
                }}><option value="">Chọn sản phẩm</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.sku}</option>)}</select></label>
                <label><span>Số lượng</span><input type="number" min="1" required value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} /></label>
                <label><span>Đơn giá</span><input type="number" min="0" required value={line.unitCost} onChange={(event) => updateLine(index, "unitCost", event.target.value)} /></label>
                <strong>{formatMoney(Number(line.quantity || 0) * Number(line.unitCost || 0))}</strong>
                <button type="button" aria-label="Xóa dòng" disabled={form.items.length === 1} onClick={() => removeLine(index)}>×</button>
              </div>
            ))}
          </div>
          <div className="ops-purchase-total"><span>Tổng giá trị dự kiến</span><strong>{formatMoney(form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0))}</strong></div>
          <div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={close}>Hủy</button><button className="ops-primary-button" type="submit" disabled={saving}>{saving ? "Đang tạo..." : "Tạo phiếu nhập →"}</button></div>
        </form>
      </Modal>
    </div>
  );
}
