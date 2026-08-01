import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { formatDate, formatMoney, ORDER_STATUS, PAYMENT_STATUS } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, Modal, PageHeader, ProductImage, Status } from "../components/Ui";

const primaryTransition = {
  pending: { status: "confirmed", label: "Xác nhận đơn" },
  confirmed: { status: "packing", label: "Nhận đơn & bắt đầu đóng gói" },
  packing: { status: "ready_to_ship", label: "Đóng gói hoàn tất" },
  ready_to_ship: { status: "shipping", label: "Bàn giao vận chuyển" },
  delivery_failed: { status: "shipping", label: "Giao lại đơn hàng" },
};

const cancellableStatuses = ["pending", "confirmed", "packing", "ready_to_ship", "delivery_failed"];

function blankOperation(order) {
  return {
    publicNote: "",
    internalNote: "",
    reason: "",
    carrier: order?.shipment?.carrier || "",
    trackingNumber: order?.shipment?.trackingNumber || "",
    estimatedDeliveryAt: order?.shipment?.estimatedDeliveryAt?.slice(0, 16) || "",
    refundReason: "",
    refundReference: "",
    paymentReason: "",
    paymentReference: "",
  };
}

export default function OrdersPage() {
  const { notify, user } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [operation, setOperation] = useState(blankOperation());
  const [exceptionAction, setExceptionAction] = useState("");
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (status !== "all") query.set("status", status);
      const [orderResult, employeeResult] = await Promise.all([
        api.get(`/admin/orders?${query.toString()}`),
        user?.role === "admin"
          ? api.get("/admin/employees")
          : Promise.resolve({
            data: user?.employeeId
              ? [{ id: user.employeeId, name: user.name, department: "Đơn của tôi" }]
              : [],
          }),
      ]);
      setOrders(orderResult.data);
      setEmployees(employeeResult.data.filter((item) => item.status === "active"));
      const openId = searchParams.get("open");
      setSelected((current) => {
        const targetId = openId || current?.id;
        return targetId ? orderResult.data.find((item) => item.id === targetId) || null : current;
      });
    } catch (requestError) {
      if (!silent) setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [search, status, searchParams, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => load({ silent: true }), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    setOperation(blankOperation(selected));
    setExceptionAction("");
  // Polling replaces object identity; keep in-progress form input until the server version changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.version]);

  const counts = useMemo(() => Object.keys(ORDER_STATUS).reduce((result, key) => {
    result[key] = orders.filter((order) => order.status === key).length;
    return result;
  }, {}), [orders]);

  const selectOrder = (order) => {
    setSelected(order);
    const next = new URLSearchParams(searchParams);
    next.set("open", order.id);
    setSearchParams(next, { replace: true });
  };

  const closeModal = () => {
    setSelected(null);
    const next = new URLSearchParams(searchParams);
    next.delete("open");
    setSearchParams(next, { replace: true });
  };

  const acceptUpdatedOrder = (order) => {
    setSelected(order);
    setOrders((current) => current.map((item) => item.id === order.id ? order : item));
  };

  const updateOrder = async (changes) => {
    if (!selected) return;
    setUpdating(true);
    try {
      const result = await api.patch(`/admin/orders/${selected.id}`, {
        ...changes,
        expectedVersion: selected.version,
      });
      acceptUpdatedOrder(result.data);
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
      if ([409, 428].includes(requestError.status)) await load({ silent: true });
    } finally {
      setUpdating(false);
    }
  };

  const moveTo = async (nextStatus) => {
    const changes = {
      status: nextStatus,
      publicNote: operation.publicNote,
      internalNote: operation.internalNote,
    };
    if (["cancelled", "delivery_failed"].includes(nextStatus)) changes.reason = operation.reason;
    if (nextStatus === "shipping") {
      changes.shipment = {
        carrier: operation.carrier,
        trackingNumber: operation.trackingNumber,
        estimatedDeliveryAt: operation.estimatedDeliveryAt || null,
      };
    }
    await updateOrder(changes);
    setExceptionAction("");
  };

  const completeRefund = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const result = await api.patch(`/admin/orders/${selected.id}/refund`, {
        expectedVersion: selected.version,
        reason: operation.refundReason,
        reference: operation.refundReference,
      });
      acceptUpdatedOrder(result.data);
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
      if ([409, 428].includes(requestError.status)) await load({ silent: true });
    } finally {
      setUpdating(false);
    }
  };

  const reconcilePayment = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const result = await api.patch(`/admin/orders/${selected.id}/payment-reconcile`, {
        expectedVersion: selected.version,
        reason: operation.paymentReason,
        reference: operation.paymentReference,
      });
      acceptUpdatedOrder(result.data);
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
      if ([409, 428].includes(requestError.status)) await load({ silent: true });
    } finally {
      setUpdating(false);
    }
  };

  const payment = selected ? PAYMENT_STATUS[selected.paymentStatus] || { label: selected.paymentStatus, tone: "neutral" } : null;
  const nextAction = selected ? primaryTransition[selected.status] : null;
  const bankWaiting = selected?.paymentMethod === "bank" && selected.paymentStatus !== "paid";

  return (
    <div>
      <PageHeader
        eyebrow="Sales pipeline"
        title="Đơn hàng"
        copy="Đơn COD được xác nhận ngay; đơn chuyển khoản tự xác nhận khi SePay ghi nhận đủ tiền. Nhân viên bắt đầu từ khâu đóng gói."
        actions={<button className="ops-secondary-button" type="button" onClick={() => load()}>↻ Làm mới</button>}
      />

      <section className="ops-order-summary-cards">
        {[
          ["pending", "Chờ thanh toán", "SePay tự xác nhận"],
          ["confirmed", "Đã sẵn sàng", "Chờ nhân viên nhận"],
          ["packing", "Đang đóng gói", "Tại kho"],
          ["ready_to_ship", "Chờ bàn giao", "Sẵn sàng gửi"],
          ["shipping", "Đang giao", "Theo dõi vận đơn"],
          ["delivery_failed", "Giao chưa đạt", "Cần xử lý lại"],
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
        {error && <ErrorPanel message={error} onRetry={() => load()} />}
        {!loading && !error && orders.length > 0 && (
          <div className="ops-table-wrap">
            <table className="ops-table ops-orders-table">
              <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Thanh toán</th><th>Trạng thái</th><th>Phụ trách</th><th>Tổng tiền</th><th /></tr></thead>
              <tbody>
                {orders.map((order) => {
                  const assignee = employees.find((employee) => employee.id === order.assigneeId);
                  const paymentState = PAYMENT_STATUS[order.paymentStatus] || { label: order.paymentStatus };
                  return (
                    <tr key={order.id} onClick={() => selectOrder(order)}>
                      <td><strong>{order.id}</strong><small>{formatDate(order.createdAt, true)}</small></td>
                      <td><div className="ops-customer-cell"><span>{order.customer.name.charAt(0)}</span><div><strong>{order.customer.name}</strong><small>{order.customer.phone}</small></div></div></td>
                      <td><span className="ops-items-count">{order.items.reduce((sum, item) => sum + item.quantity, 0)} món</span></td>
                      <td><span className={`payment-state payment-state--${order.paymentStatus}`}>{paymentState.label}</span></td>
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

      <Modal open={Boolean(selected)} title={selected?.id || ""} subtitle={selected ? `Đặt lúc ${formatDate(selected.createdAt, true)} · Mã tra cứu ${selected.trackingCode}` : ""} onClose={closeModal} wide>
        {selected && (
          <div className="ops-order-detail">
            <div className="ops-order-detail__status">
              <div><span>Trạng thái đơn</span><Status value={selected.status} /></div>
              <div><span>Thanh toán</span><b className={`payment-state payment-state--${selected.paymentStatus}`}>{payment.label}</b></div>
              {user?.role === "admin" ? (
                <label><span>Nhân viên phụ trách</span><select value={selected.assigneeId || ""} onChange={(event) => updateOrder({ assigneeId: event.target.value })} disabled={updating}><option value="">Chưa phân công</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.name} · {employee.department}</option>)}</select></label>
              ) : (
                <div className="ops-staff-assignment">
                  <span>Nhân viên phụ trách</span>
                  {selected.assigneeId === user?.employeeId
                    ? <strong>Bạn đang phụ trách</strong>
                    : <button className="ops-secondary-button" type="button" disabled={updating || !user?.employeeId} onClick={() => updateOrder({ assigneeId: user.employeeId })}>Nhận xử lý</button>}
                </div>
              )}
            </div>

            <div className="ops-order-detail__grid">
              <section>
                <h3>Sản phẩm ({selected.items.reduce((sum, item) => sum + item.quantity, 0)})</h3>
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
                  {selected.membershipDiscount > 0 && <div><span>Quyền lợi hạng {selected.membershipTier}</span><strong>−{formatMoney(selected.membershipDiscount)}</strong></div>}
                  {selected.couponDiscount > 0 && <div><span>Mã ưu đãi {selected.couponCode}</span><strong>−{formatMoney(selected.couponDiscount)}</strong></div>}
                  {!selected.membershipDiscount && !selected.couponDiscount && selected.discount > 0 && <div><span>Ưu đãi {selected.couponCode}</span><strong>−{formatMoney(selected.discount)}</strong></div>}
                  <div><span>Tổng thanh toán</span><strong>{formatMoney(selected.total)}</strong></div>
                </div>

                {!['delivered', 'cancelled'].includes(selected.status) && (
                  <div className="ops-order-workflow">
                    <div><p>Thao tác nghiệp vụ</p><h3>{ORDER_STATUS[selected.status]?.label}</h3><span>Dữ liệu ở đây được ghi vào lịch sử và đồng bộ cho khách hàng.</span></div>
                    {(selected.status === "ready_to_ship" || selected.status === "delivery_failed") && (
                      <div className="ops-workflow-fields ops-workflow-fields--three">
                        <label><span>Đơn vị vận chuyển *</span><input value={operation.carrier} onChange={(event) => setOperation((current) => ({ ...current, carrier: event.target.value }))} placeholder="Ví dụ: GHN" /></label>
                        <label><span>Mã vận đơn *</span><input value={operation.trackingNumber} onChange={(event) => setOperation((current) => ({ ...current, trackingNumber: event.target.value }))} placeholder="Mã từ đơn vị vận chuyển" /></label>
                        <label><span>Dự kiến giao</span><input type="datetime-local" value={operation.estimatedDeliveryAt} onChange={(event) => setOperation((current) => ({ ...current, estimatedDeliveryAt: event.target.value }))} /></label>
                      </div>
                    )}
                    <details className="ops-workflow-notes">
                      <summary>Thêm thông báo hoặc ghi chú nội bộ</summary>
                      <div className="ops-workflow-fields">
                        <label><span>Thông báo cho khách</span><textarea rows="2" value={operation.publicNote} onChange={(event) => setOperation((current) => ({ ...current, publicNote: event.target.value }))} placeholder="Bỏ trống để dùng thông báo mặc định theo trạng thái." /></label>
                        <label><span>Ghi chú nội bộ</span><textarea rows="2" value={operation.internalNote} onChange={(event) => setOperation((current) => ({ ...current, internalNote: event.target.value }))} placeholder="Chỉ nhân viên nhìn thấy" /></label>
                      </div>
                    </details>
                    {exceptionAction && (
                      <div className="ops-workflow-exception">
                        <label className="ops-workflow-reason"><span>{exceptionAction === "cancelled" ? "Lý do hủy đơn *" : "Lý do giao chưa thành công *"}</span><input autoFocus value={operation.reason} onChange={(event) => setOperation((current) => ({ ...current, reason: event.target.value }))} placeholder="Ghi rõ lý do để khách hàng cùng nắm" /></label>
                        <div><button className="ops-secondary-button" type="button" onClick={() => setExceptionAction("")}>Quay lại</button><button className="ops-danger-button" type="button" disabled={updating || operation.reason.trim().length < 5} onClick={() => moveTo(exceptionAction)}>{exceptionAction === "cancelled" ? "Xác nhận hủy đơn" : "Xác nhận giao chưa thành công"}</button></div>
                      </div>
                    )}
                    {bankWaiting && <p className="ops-workflow-warning">Đơn chuyển khoản chỉ được xác nhận sau khi hệ thống SePay ghi nhận đủ tiền.</p>}
                    {!exceptionAction && <div className="ops-workflow-actions">
                      {cancellableStatuses.includes(selected.status) && <button className="ops-danger-button" type="button" disabled={updating} onClick={() => setExceptionAction("cancelled")}>Hủy đơn</button>}
                      {selected.status === "shipping" && <button className="ops-danger-button" type="button" disabled={updating} onClick={() => setExceptionAction("delivery_failed")}>Giao chưa thành công</button>}
                      {selected.status === "shipping" && <button className="ops-primary-button" type="button" disabled={updating} onClick={() => moveTo("delivered")}>Xác nhận giao thành công</button>}
                      {nextAction && <button className="ops-primary-button" type="button" disabled={updating || bankWaiting || (nextAction.status === "shipping" && (!operation.carrier.trim() || !operation.trackingNumber.trim()))} onClick={() => moveTo(nextAction.status)}>{updating ? "Đang cập nhật..." : `${nextAction.label} →`}</button>}
                    </div>}
                  </div>
                )}

                {selected.status === "cancelled" && selected.paymentStatus === "refund_pending" && user?.role === "admin" && (
                  <div className="ops-order-workflow ops-refund-workflow">
                    <div><p>Đối soát tài chính</p><h3>Xác nhận hoàn tiền</h3><span>Chỉ hoàn tất sau khi giao dịch hoàn đã thành công tại ngân hàng/cổng thanh toán.</span></div>
                    <div className="ops-workflow-fields">
                      <label><span>Mã giao dịch hoàn *</span><input value={operation.refundReference} onChange={(event) => setOperation((current) => ({ ...current, refundReference: event.target.value }))} /></label>
                      <label><span>Nội dung đối soát *</span><input value={operation.refundReason} onChange={(event) => setOperation((current) => ({ ...current, refundReason: event.target.value }))} /></label>
                    </div>
                    <button className="ops-primary-button" type="button" disabled={updating || operation.refundReference.trim().length < 4 || operation.refundReason.trim().length < 5} onClick={completeRefund}>Đã hoàn tiền cho khách</button>
                  </div>
                )}

                {selected.status === "delivered" && selected.paymentStatus === "review_required" && user?.role === "admin" && (
                  <div className="ops-order-workflow ops-refund-workflow">
                    <div><p>Ngoại lệ tài chính</p><h3>Đối soát thanh toán</h3><span>Đơn cũ đã giao nhưng chưa có chứng từ thu tiền. Không tự động coi là doanh thu.</span></div>
                    <div className="ops-workflow-fields">
                      <label><span>Mã chứng từ/giao dịch *</span><input value={operation.paymentReference} onChange={(event) => setOperation((current) => ({ ...current, paymentReference: event.target.value }))} /></label>
                      <label><span>Nội dung đối soát *</span><input value={operation.paymentReason} onChange={(event) => setOperation((current) => ({ ...current, paymentReason: event.target.value }))} /></label>
                    </div>
                    <button className="ops-primary-button" type="button" disabled={updating || operation.paymentReference.trim().length < 4 || operation.paymentReason.trim().length < 5} onClick={reconcilePayment}>Xác nhận đã thu đủ tiền</button>
                  </div>
                )}
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
                {(selected.shipment?.trackingNumber || selected.status === "delivery_failed") && <div className="ops-detail-card"><h3>Vận chuyển</h3><strong>{selected.shipment?.carrier || "Chưa cập nhật"}</strong><p>Mã vận đơn: {selected.shipment?.trackingNumber || "—"}</p><p>Số lần giao: {selected.deliveryAttempts || 0}</p>{selected.shipment?.estimatedDeliveryAt && <p>Dự kiến: {formatDate(selected.shipment.estimatedDeliveryAt, true)}</p>}{selected.lastDeliveryFailure && <blockquote>“{selected.lastDeliveryFailure.reason}”</blockquote>}</div>}
                <div className="ops-detail-card">
                  <h3>Lịch sử xử lý</h3>
                  <div className="ops-detail-timeline">
                    {[...selected.timeline].reverse().map((entry) => (
                      <div key={entry.id || `${entry.status}-${entry.at}`}><i>✓</i><span><strong>{entry.label}</strong>{entry.note && <p>{entry.note}</p>}<small>{entry.actorName || "Hệ thống NOVAWEAR"} · {formatDate(entry.at, true)}</small>{entry.internalNote && <em>Nội bộ: {entry.internalNote}</em>}</span></div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
