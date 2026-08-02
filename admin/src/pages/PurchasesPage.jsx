import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { formatDate, formatMoney } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, Modal, PageHeader } from "../components/Ui";

const newLine = () => ({ productId: "", quantity: 1, unitCost: "" });
const newForm = () => ({
  supplierId: "",
  supplier: "",
  expectedDate: "",
  paymentDueDate: "",
  paymentMethod: "bank_transfer",
  items: [newLine()],
});

const PAYMENT_LABELS = {
  unpaid: "Chưa thanh toán",
  partial: "Thanh toán một phần",
  paid: "Đã thanh toán",
};

const getBalanceDue = (order) =>
  Math.max(
    0,
    Number(
      order?.balanceDue ??
        Number(order?.total || 0) - Number(order?.amountPaid || 0)
    )
  );

export default function PurchasesPage() {
  const { notify, user } = useAdmin();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(newForm);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [payment, setPayment] = useState({ amount: "", method: "bank_transfer", reference: "", note: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const requests = [api.get("/admin/purchase-orders"), api.get("/admin/products?status=active")];
      if (user?.role === "admin") requests.push(api.get("/admin/suppliers"));
      const [purchaseResult, productResult, supplierResult] = await Promise.all(requests);
      setOrders(purchaseResult.data);
      setProducts(productResult.data);
      setSuppliers(supplierResult?.data || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => ({
    ordered: orders.filter((item) => item.status !== "received").length,
    unpaid: orders.reduce((sum, item) => sum + Number(item.balanceDue ?? item.total ?? 0), 0),
    received: orders.filter((item) => item.status === "received").length,
  }), [orders]);

  const updateLine = (index, field, value) => setForm((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
  }));
  const addLine = () => setForm((current) => ({ ...current, items: [...current.items, newLine()] }));
  const removeLine = (index) => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  const closeCreate = () => { setCreateOpen(false); setForm(newForm()); };

  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api.post("/admin/purchase-orders", {
        ...form,
        items: form.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
      });
      notify(result.message);
      closeCreate();
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const receive = async (order) => {
    if (!window.confirm(`Xác nhận đã kiểm đủ hàng của ${order.id}? Tồn kho sẽ được cộng ngay.`)) return;
    try {
      const result = await api.patch(`/admin/purchase-orders/${order.id}/receive`, {});
      notify(result.message);
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };

  const openPayment = (order) => {
    const balance = getBalanceDue(order);
    setPaymentOrder(order);
    setPayment({ amount: String(Math.max(0, balance)), method: order.preferredPaymentMethod || "bank_transfer", reference: "", note: "" });
  };

  const recordPayment = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api.patch(`/admin/purchase-orders/${paymentOrder.id}/payment`, {
        ...payment,
        amount: Number(payment.amount),
      });
      notify(result.message);
      setPaymentOrder(null);
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Hàng hóa" title="Nhập hàng" copy="Theo dõi đơn đặt nhà cung cấp, hàng về kho và công nợ phải trả." actions={user?.role === "admin" ? <button className="ops-primary-button" type="button" onClick={() => setCreateOpen(true)}>＋ Tạo đơn nhập</button> : null} />

      <div className="ops-compact-summary ops-compact-summary--purchases">
        <div><strong>{totals.ordered}</strong><span>Đơn đang chờ hàng</span></div>
        <div><strong>{totals.received}</strong><span>Đã nhập kho</span></div>
        <div><strong>{formatMoney(totals.unpaid)}</strong><span>Công nợ nhà cung cấp</span></div>
      </div>

      {loading && <Loading rows={5} />}
      {error && <ErrorPanel message={error} onRetry={load} />}
      {!loading && !error && orders.length > 0 && (
        <section className="ops-panel ops-purchase-table">
          <header><strong>Phiếu nhập</strong><strong>Nhà cung cấp</strong><strong>Hàng hóa</strong><strong>Thanh toán</strong><strong>Tổng tiền</strong><span /></header>
          {orders.map((order) => {
            const balanceDue = getBalanceDue(order);
            return (
              <article key={order.id}>
                <div><strong>{order.id}</strong><span>{formatDate(order.createdAt)}</span></div>
                <div><strong>{order.supplier}</strong><span>Dự kiến {order.expectedDate ? formatDate(order.expectedDate) : "chưa đặt"}</span></div>
                <div><span className={`purchase-status purchase-status--${order.status}`}>{order.status === "received" ? "Đã nhập kho" : "Chờ hàng"}</span><small>{order.items.length} dòng sản phẩm</small></div>
                <div><span className={`purchase-payment purchase-payment--${order.paymentStatus || "unpaid"}`}>{PAYMENT_LABELS[order.paymentStatus] || PAYMENT_LABELS.unpaid}</span><small>{balanceDue > 0 ? `Còn ${formatMoney(balanceDue)}${order.paymentDueDate ? ` · hạn ${formatDate(order.paymentDueDate)}` : ""}` : "Đã quyết toán"}</small></div>
                <strong>{formatMoney(order.total)}</strong>
                <footer>
                  {user?.role === "admin" && balanceDue > 0 && <button type="button" onClick={() => openPayment(order)}>Thanh toán</button>}
                  {user?.role === "admin" && order.status !== "received" && <button className="is-primary" type="button" onClick={() => receive(order)}>Nhập kho</button>}
                </footer>
              </article>
            );
          })}
        </section>
      )}
      {!loading && !error && !orders.length && <Empty title="Chưa có đơn nhập hàng" copy="Tạo đơn đầu tiên khi cần bổ sung tồn kho." />}

      <Modal open={createOpen} title="Tạo đơn nhập hàng" subtitle="Đơn đặt gửi nhà cung cấp" onClose={closeCreate} wide>
        <form className="ops-purchase-form" onSubmit={create}>
          <div className="ops-form-grid">
            {suppliers.length ? (
              <label className="ops-field"><span>Nhà cung cấp *</span><select required value={form.supplierId} onChange={(event) => {
                const supplier = suppliers.find((item) => item.id === event.target.value);
                setForm((current) => ({ ...current, supplierId: event.target.value, supplier: supplier?.name || "" }));
              }}><option value="">Chọn nhà cung cấp</option>{suppliers.filter((item) => item.status === "active").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            ) : <label className="ops-field"><span>Nhà cung cấp *</span><input required value={form.supplier} onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))} /></label>}
            <label className="ops-field"><span>Ngày dự kiến nhận</span><input type="date" value={form.expectedDate} onChange={(event) => setForm((current) => ({ ...current, expectedDate: event.target.value }))} /></label>
            <label className="ops-field"><span>Hạn thanh toán</span><input type="date" value={form.paymentDueDate} onChange={(event) => setForm((current) => ({ ...current, paymentDueDate: event.target.value }))} /></label>
            <label className="ops-field"><span>Phương thức dự kiến</span><select value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}><option value="bank_transfer">Chuyển khoản</option><option value="cash">Tiền mặt</option><option value="other">Khác</option></select></label>
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
                <label><span>Giá nhập</span><input type="number" min="0" required value={line.unitCost} onChange={(event) => updateLine(index, "unitCost", event.target.value)} /></label>
                <strong>{formatMoney(Number(line.quantity || 0) * Number(line.unitCost || 0))}</strong>
                <button type="button" aria-label="Xóa dòng" disabled={form.items.length === 1} onClick={() => removeLine(index)}>×</button>
              </div>
            ))}
          </div>
          <div className="ops-purchase-total"><span>Tổng giá trị</span><strong>{formatMoney(form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0))}</strong></div>
          <div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={closeCreate}>Hủy</button><button className="ops-primary-button" type="submit" disabled={saving}>{saving ? "Đang tạo..." : "Tạo đơn nhập"}</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(paymentOrder)} title="Ghi nhận thanh toán" subtitle={paymentOrder ? `${paymentOrder.id} · ${paymentOrder.supplier}` : ""} onClose={() => setPaymentOrder(null)}>
        <form className="ops-simple-form" onSubmit={recordPayment}>
          <div className="ops-payment-balance"><span>Công nợ còn lại</span><strong>{formatMoney(getBalanceDue(paymentOrder))}</strong></div>
          <label className="ops-field"><span>Số tiền thanh toán *</span><input type="number" min="1" max={getBalanceDue(paymentOrder) || undefined} required value={payment.amount} onChange={(event) => setPayment((current) => ({ ...current, amount: event.target.value }))} /></label>
          <label className="ops-field"><span>Phương thức</span><select value={payment.method} onChange={(event) => setPayment((current) => ({ ...current, method: event.target.value }))}><option value="bank_transfer">Chuyển khoản</option><option value="cash">Tiền mặt</option><option value="other">Khác</option></select></label>
          {payment.method === "bank_transfer" && <label className="ops-field"><span>Mã giao dịch / nội dung chuyển khoản *</span><input required minLength={3} value={payment.reference} onChange={(event) => setPayment((current) => ({ ...current, reference: event.target.value }))} /></label>}
          <label className="ops-field"><span>Ghi chú</span><textarea rows={3} value={payment.note} onChange={(event) => setPayment((current) => ({ ...current, note: event.target.value }))} /></label>
          <div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={() => setPaymentOrder(null)}>Hủy</button><button className="ops-primary-button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Xác nhận thanh toán"}</button></div>
        </form>
      </Modal>
    </div>
  );
}
