import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { formatDate, formatMoney, ORDER_STATUS } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, Modal, PageHeader, ProductImage, Status } from "../components/Ui";

const nextStatus = {
  pending: "confirmed",
  confirmed: "packing",
  packing: "shipping",
  shipping: "delivered",
};

export default function OrdersPage() {
  const { notify } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (status !== "all") query.set("status", status);
      const [orderResult, employeeResult] = await Promise.all([
        api.get(`/admin/orders?${query.toString()}`),
        api.get("/admin/employees"),
      ]);
      setOrders(orderResult.data);
      setEmployees(employeeResult.data.filter((item) => item.status === "active"));
      const openId = searchParams.get("open");
      if (openId) {
        const match = orderResult.data.find((item) => item.id === openId);
        if (match) setSelected(match);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const counts = useMemo(() => Object.keys(ORDER_STATUS).reduce((result, key) => {
    result[key] = orders.filter((order) => order.status === key).length;
    return result;
  }, {}), [orders]);

  const closeModal = () => {
    setSelected(null);
    if (searchParams.get("open")) {
      const next = new URLSearchParams(searchParams);
      next.delete("open");
      setSearchParams(next, { replace: true });
    }
  };

  const updateOrder = async (changes) => {
    if (!selected) return;
    setUpdating(true);
    try {
      const result = await api.patch(`/admin/orders/${selected.id}`, changes);
      setSelected(result.data);
      setOrders((current) => current.map((item) => item.id === result.data.id ? result.data : item));
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Sales pipeline"
        title="Đơn hàng"
        copy="Theo dõi và xử lý toàn bộ đơn từ lúc tiếp nhận tới giao thành công."
        actions={<button className="ops-secondary-button" type="button" onClick={load}>↻ Làm mới</button>}
      />

      <section className="ops-order-summary-cards">
        {[
          ["pending", "Chờ xác nhận", "Cần xử lý sớm"],
          ["confirmed", "Đã xác nhận", "Chuẩn bị đóng gói"],
          ["packing", "Đang đóng gói", "Tại kho"],
          ["shipping", "Đang giao", "Trên đường"],
          ["delivered", "Đã giao", "Hoàn tất"],
        ].map(([key, label, copy]) => (
          <button className={status === key ? "is-active" : ""} type="button" onClick={() => setStatus(status === key ? "all" : key)} key={key}>
            <i className={`dot dot--${key}`} /><span><strong>{counts[key] || 0}</strong><small>{label}</small></span><b>{copy}</b>
          </button>
        ))}
      </section>

      <section className="ops-panel ops-list-panel">
        <div className="ops-list-toolbar">
          <div className="ops-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã đơn, tên hoặc số điện thoại..." /></div>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(ORDER_STATUS).map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}
          </select>
          <span>{orders.length} kết quả</span>
        </div>

        {loading && <Loading rows={6} />}
        {error && <ErrorPanel message={error} onRetry={load} />}
        {!loading && !error && orders.length > 0 && (
          <div className="ops-table-wrap">
            <table className="ops-table ops-orders-table">
              <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Thanh toán</th><th>Trạng thái</th><th>Phụ trách</th><th>Tổng tiền</th><th /></tr></thead>
              <tbody>
                {orders.map((order) => {
                  const assignee = employees.find((employee) => employee.id === order.assigneeId);
                  return (
                    <tr key={order.id} onClick={() => setSelected(order)}>
                      <td><strong>{order.id}</strong><small>{formatDate(order.createdAt, true)}</small></td>
                      <td><div className="ops-customer-cell"><span>{order.customer.name.charAt(0)}</span><div><strong>{order.customer.name}</strong><small>{order.customer.phone}</small></div></div></td>
                      <td><span className="ops-items-count">{order.items.length} món</span></td>
                      <td><span className={`payment-state payment-state--${order.paymentStatus}`}>{order.paymentStatus === "paid" ? "Đã thanh toán" : order.paymentStatus === "awaiting" ? "Chờ chuyển khoản" : "COD"}</span></td>
                      <td><Status value={order.status} /></td>
                      <td>{assignee ? <span className="ops-assignee"><i>{assignee.name.charAt(0)}</i>{assignee.name.split(" ").slice(-1)[0]}</span> : <span className="ops-muted">Chưa gán</span>}</td>
                      <td><strong>{formatMoney(order.total)}</strong></td>
                      <td><button type="button" aria-label="Xem chi tiết">→</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && !orders.length && <Empty title="Không có đơn phù hợp" copy="Thử thay đổi từ khóa hoặc bộ lọc trạng thái." />}
      </section>

      <Modal open={Boolean(selected)} title={selected?.id || ""} subtitle={selected ? `Đặt lúc ${formatDate(selected.createdAt, true)} · ${selected.trackingCode}` : ""} onClose={closeModal} wide>
        {selected && (
          <div className="ops-order-detail">
            <div className="ops-order-detail__status">
              <div><span>Trạng thái hiện tại</span><Status value={selected.status} /></div>
              <label><span>Nhân viên phụ trách</span><select value={selected.assigneeId || ""} onChange={(event) => updateOrder({ assigneeId: event.target.value })} disabled={updating}><option value="">Chưa phân công</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.name} · {employee.department}</option>)}</select></label>
              <label><span>Thanh toán</span><select value={selected.paymentStatus} onChange={(event) => updateOrder({ paymentStatus: event.target.value })} disabled={updating}><option value="pending">Chờ COD</option><option value="awaiting">Chờ chuyển khoản</option><option value="paid">Đã thanh toán</option><option value="refunded">Đã hoàn tiền</option><option value="failed">Thất bại</option></select></label>
            </div>

            <div className="ops-order-detail__grid">
              <section>
                <h3>Sản phẩm ({selected.items.length})</h3>
                <div className="ops-order-lines">
                  {selected.items.map((item, index) => (
                    <div key={`${item.productId}-${index}`}>
                      <ProductImage src={item.image} alt={item.name} />
                      <span><strong>{item.name}</strong><small>{item.sku} · {item.color} · Size {item.size}</small><small>Số lượng {item.quantity}</small></span>
                      <b>{formatMoney(item.price * item.quantity)}</b>
                    </div>
                  ))}
                </div>
                <div className="ops-order-money">
                  <div><span>Tạm tính</span><strong>{formatMoney(selected.subtotal)}</strong></div>
                  <div><span>Giao hàng</span><strong>{selected.shippingFee ? formatMoney(selected.shippingFee) : "Miễn phí"}</strong></div>
                  {selected.discount > 0 && <div><span>Ưu đãi {selected.couponCode}</span><strong>−{formatMoney(selected.discount)}</strong></div>}
                  <div><span>Tổng thanh toán</span><strong>{formatMoney(selected.total)}</strong></div>
                </div>
              </section>
              <aside>
                <div className="ops-detail-card">
                  <h3>Thông tin giao hàng</h3>
                  <strong>{selected.customer.name}</strong>
                  <p>{selected.customer.phone}</p>
                  <p>{selected.customer.email || "Không có email"}</p>
                  <p>{selected.customer.address}</p>
                  {selected.note && <blockquote>“{selected.note}”</blockquote>}
                </div>
                <div className="ops-detail-card">
                  <h3>Lịch sử xử lý</h3>
                  <div className="ops-detail-timeline">
                    {selected.timeline.map((entry, index) => (
                      <div key={`${entry.status}-${index}`}><i>✓</i><span><strong>{entry.label}</strong><small>{formatDate(entry.at, true)}</small></span></div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>

            <footer className="ops-order-detail__actions">
              {["pending", "confirmed", "packing"].includes(selected.status) && <button className="ops-danger-button" type="button" disabled={updating} onClick={() => updateOrder({ status: "cancelled" })}>Hủy đơn</button>}
              <div />
              {nextStatus[selected.status] && (
                <button className="ops-primary-button" type="button" disabled={updating} onClick={() => updateOrder({ status: nextStatus[selected.status] })}>
                  {updating ? "Đang cập nhật..." : `${ORDER_STATUS[nextStatus[selected.status]].label} →`}
                </button>
              )}
            </footer>
          </div>
        )}
      </Modal>
    </div>
  );
}
