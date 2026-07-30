import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { formatDate, formatMoney, RETURN_STATUS } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, PageHeader, ProductImage } from "../components/Ui";

const nextSteps = {
  requested: { status: "approved", label: "Chấp thuận yêu cầu" },
  approved: { status: "receiving", label: "Xác nhận đang nhận hàng" },
  receiving: { status: "inspecting", label: "Bắt đầu kiểm tra" },
  inspecting: { status: "completed", label: "Hoàn tất kiểm tra" },
};

const blankForm = {
  publicNote: "",
  internalNote: "",
  returnCarrier: "",
  returnTrackingNumber: "",
  exchangeCarrier: "",
  exchangeTrackingNumber: "",
  inventoryDisposition: "",
  refundReference: "",
  refundNote: "",
};

export default function ReturnsPage() {
  const { notify, user } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const data = (await api.get("/admin/returns")).data;
      setItems(data);
      setSelected((current) => {
        const targetId = searchParams.get("open") || current?.id;
        return data.find((item) => item.id === targetId) || data[0] || null;
      });
    } catch (requestError) {
      if (!silent) setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => load({ silent: true }), 15000);
    return () => window.clearInterval(timer);
  }, [load]);
  useEffect(() => {
    setForm({
      ...blankForm,
      returnCarrier: selected?.returnShipment?.carrier || "",
      returnTrackingNumber: selected?.returnShipment?.trackingNumber || "",
      exchangeCarrier: selected?.exchangeShipment?.carrier || "",
      exchangeTrackingNumber: selected?.exchangeShipment?.trackingNumber || "",
    });
  // Polling replaces object identity; keep in-progress form input until the server version changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.version]);

  const choose = (item) => {
    setSelected(item);
    const next = new URLSearchParams(searchParams);
    next.set("open", item.id);
    setSearchParams(next, { replace: true });
  };

  const update = async (status) => {
    if (!selected) return;
    setUpdating(true);
    try {
      const result = await api.patch(`/admin/returns/${selected.id}`, {
        expectedVersion: selected.version,
        status,
        publicNote: form.publicNote,
        internalNote: form.internalNote,
        inventoryDisposition: form.inventoryDisposition,
        returnShipment: { carrier: form.returnCarrier, trackingNumber: form.returnTrackingNumber },
        exchangeShipment: { carrier: form.exchangeCarrier, trackingNumber: form.exchangeTrackingNumber },
      });
      setSelected({ ...result.data, order: selected.order, assignee: selected.assignee });
      setItems((current) => current.map((item) => item.id === result.data.id ? { ...item, ...result.data } : item));
      notify(result.message);
      await load({ silent: true });
    } catch (requestError) {
      notify(requestError.message, "error");
      if ([409, 428].includes(requestError.status)) await load({ silent: true });
    } finally {
      setUpdating(false);
    }
  };

  const refund = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const result = await api.patch(`/admin/returns/${selected.id}/refund`, {
        expectedVersion: selected.version,
        reference: form.refundReference,
        internalNote: form.refundNote,
      });
      notify(result.message);
      await load({ silent: true });
    } catch (requestError) {
      notify(requestError.message, "error");
      if ([409, 428].includes(requestError.status)) await load({ silent: true });
    } finally {
      setUpdating(false);
    }
  };

  const next = selected ? nextSteps[selected.status] : null;
  const responseRequired = selected?.status === "requested";
  const inspectionRequired = selected?.status === "inspecting";
  const exchangeShipmentRequired = inspectionRequired && selected?.type === "exchange";

  return (
    <div>
      <PageHeader eyebrow="After sales" title="Đổi trả & hoàn tiền" copy="Tiếp nhận, nhận hàng hoàn, kiểm tra chất lượng và đối soát hoàn tiền theo đúng từng bước." />
      {loading && <Loading rows={6} />}{error && <ErrorPanel message={error} onRetry={() => load()} />}
      {!loading && !error && items.length > 0 && (
        <section className="ops-return-layout">
          <aside className="ops-panel ops-return-list">
            {items.map((item) => <button className={selected?.id === item.id ? "is-active" : ""} onClick={() => choose(item)} type="button" key={item.id}><span><strong>{item.id}</strong><small>{item.orderId} · {formatDate(item.createdAt)}</small></span><b>{RETURN_STATUS[item.status]?.label || item.status}</b><em>{item.type === "return" ? formatMoney(item.refundAmount) : "Đổi hàng"}</em></button>)}
          </aside>
          {selected && (
            <article className="ops-panel ops-return-detail">
              <header><div><p>{selected.type === "exchange" ? "ĐỔI SẢN PHẨM" : "TRẢ HÀNG"}</p><h2>{selected.id}</h2><span>Đơn {selected.orderId} · {selected.order?.customer?.name}</span></div><b className={`return-state return-state--${selected.status}`}>{RETURN_STATUS[selected.status]?.label}</b></header>
              <div className="ops-return-items">
                {selected.items.map((line) => <div key={`${line.productId}-${line.size}-${line.color}`}><ProductImage src={line.image} alt={line.name} /><span><strong>{line.name}</strong><small>Nhận lại: {line.color} · Size {line.size} · SL {line.quantity}</small>{selected.type === "exchange" && <small className="ops-exchange-target">Đổi sang: {line.desiredColor} · Size {line.desiredSize}</small>}</span><b>{formatMoney(line.price * line.quantity)}</b></div>)}
              </div>
              <section className="ops-return-reason"><span>Lý do khách hàng</span><p>{selected.reason}</p>{selected.note && <small>{selected.note}</small>}</section>

              {!['completed', 'rejected', 'cancelled'].includes(selected.status) && (
                <section className="ops-return-workflow">
                  <div><span>Bước xử lý hiện tại</span><h3>{RETURN_STATUS[selected.status]?.label}</h3><p>Mỗi cập nhật đều được lưu lịch sử và gửi thông báo cho khách hàng.</p></div>
                  <div className="ops-workflow-fields">
                    <label><span>Phản hồi cho khách {responseRequired ? "*" : ""}</span><textarea rows="3" value={form.publicNote} onChange={(event) => setForm((current) => ({ ...current, publicNote: event.target.value }))} placeholder="Hướng dẫn đóng gói, gửi hàng hoặc lý do xử lý..." /></label>
                    <label><span>Kết quả/ghi chú nội bộ {inspectionRequired ? "*" : ""}</span><textarea rows="3" value={form.internalNote} onChange={(event) => setForm((current) => ({ ...current, internalNote: event.target.value }))} placeholder="Tình trạng tem, sản phẩm, phụ kiện, kết quả kiểm tra..." /></label>
                  </div>
                  {selected.status === "approved" && <div className="ops-workflow-fields"><label><span>Đơn vị vận chuyển hàng hoàn</span><input value={form.returnCarrier} onChange={(event) => setForm((current) => ({ ...current, returnCarrier: event.target.value }))} /></label><label><span>Mã vận đơn hàng hoàn</span><input value={form.returnTrackingNumber} onChange={(event) => setForm((current) => ({ ...current, returnTrackingNumber: event.target.value }))} /></label></div>}
                  {selected.status === "inspecting" && <div className="ops-workflow-fields"><label><span>Xử lý tồn kho sau kiểm tra *</span><select value={form.inventoryDisposition} onChange={(event) => setForm((current) => ({ ...current, inventoryDisposition: event.target.value }))}><option value="">Chọn kết quả kiểm tra</option><option value="restock">Đủ điều kiện bán lại — nhập kho</option><option value="quality_hold">Tạm giữ để kiểm định</option><option value="damaged">Hàng lỗi/hư hỏng — không nhập kho</option></select></label></div>}
                  {selected.status === "inspecting" && selected.type === "exchange" && <div className="ops-workflow-fields"><label><span>Đơn vị giao sản phẩm đổi</span><input value={form.exchangeCarrier} onChange={(event) => setForm((current) => ({ ...current, exchangeCarrier: event.target.value }))} /></label><label><span>Mã vận đơn sản phẩm đổi</span><input value={form.exchangeTrackingNumber} onChange={(event) => setForm((current) => ({ ...current, exchangeTrackingNumber: event.target.value }))} /></label></div>}
                  <div className="ops-workflow-actions">
                    {['requested', 'approved', 'receiving', 'inspecting'].includes(selected.status) && <button className="ops-danger-button" disabled={updating || form.publicNote.trim().length < 5 || (inspectionRequired && form.internalNote.trim().length < 5)} onClick={() => update("rejected")} type="button">Từ chối yêu cầu</button>}
                    {next && <button className="ops-primary-button" disabled={updating || (responseRequired && form.publicNote.trim().length < 5) || (inspectionRequired && (form.internalNote.trim().length < 5 || !form.inventoryDisposition)) || (exchangeShipmentRequired && (form.exchangeCarrier.trim().length < 2 || form.exchangeTrackingNumber.trim().length < 4))} onClick={() => update(next.status)} type="button">{updating ? "Đang cập nhật..." : `${next.label} →`}</button>}
                  </div>
                </section>
              )}

              {selected.refundStatus === "pending" && user?.role === "admin" && (
                <section className="ops-return-workflow ops-refund-workflow">
                  <div><span>Đối soát hoàn tiền</span><h3>{formatMoney(selected.refundAmount)}</h3><p>Chỉ xác nhận sau khi ngân hàng/cổng thanh toán báo giao dịch hoàn thành công.</p></div>
                  <div className="ops-workflow-fields"><label><span>Mã giao dịch hoàn *</span><input value={form.refundReference} onChange={(event) => setForm((current) => ({ ...current, refundReference: event.target.value }))} /></label><label><span>Nội dung đối soát *</span><input value={form.refundNote} onChange={(event) => setForm((current) => ({ ...current, refundNote: event.target.value }))} /></label></div>
                  <button className="ops-primary-button" disabled={updating || form.refundReference.trim().length < 4 || form.refundNote.trim().length < 5} onClick={refund} type="button">Xác nhận đã hoàn tiền</button>
                </section>
              )}

              <section className="ops-return-timeline"><span>Lịch sử hai chiều</span>{[...(selected.timeline || [])].reverse().map((entry) => <div key={entry.id || `${entry.status}-${entry.at}`}><i /><p><strong>{entry.label || RETURN_STATUS[entry.status]?.label}</strong>{entry.note && <span>{entry.note}</span>}<small>{entry.actorName || "Hệ thống NOVAWEAR"} · {formatDate(entry.at, true)}</small>{entry.internalNote && <em>Nội bộ: {entry.internalNote}</em>}</p></div>)}</section>
              <footer><div><span>{selected.type === "return" ? "Số tiền dự kiến hoàn" : "Hình thức xử lý"}</span><strong>{selected.type === "return" ? formatMoney(selected.refundAmount) : "Đổi đúng biến thể đã chọn"}</strong></div><div><small>{selected.refundStatus === "refunded" ? `Đã hoàn · ${selected.refundReference}` : ""}</small></div></footer>
            </article>
          )}
        </section>
      )}
      {!loading && !error && !items.length && <section className="ops-panel"><Empty title="Chưa có yêu cầu đổi trả" copy="Các yêu cầu hợp lệ từ khách hàng sẽ xuất hiện tại đây." /></section>}
    </div>
  );
}
