import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { formatDate, formatMoney } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, PageHeader, ProductImage } from "../components/Ui";

const labels = { requested: "Mới gửi", approved: "Đã duyệt", receiving: "Chờ nhận hàng", completed: "Hoàn tất", rejected: "Từ chối" };
export default function ReturnsPage() {
  const { notify } = useAdmin();
  const [items, setItems] = useState([]); const [selected, setSelected] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const data = (await api.get("/admin/returns")).data; setItems(data); setSelected((current) => data.find((i) => i.id === current?.id) || data[0] || null); } catch (e) { setError(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const update = async (status) => { try { const result = await api.patch(`/admin/returns/${selected.id}`, { status }); notify(result.message); load(); } catch (e) { notify(e.message, "error"); } };
  return <div><PageHeader eyebrow="After sales" title="Đổi trả & hoàn tiền" copy="Theo dõi yêu cầu sau bán, hàng gửi về và khoản tiền cần hoàn." />
    {loading && <Loading rows={6} />}{error && <ErrorPanel message={error} onRetry={load} />}
    {!loading && !error && items.length > 0 && <section className="ops-return-layout"><aside className="ops-panel ops-return-list">{items.map((item) => <button className={selected?.id === item.id ? "is-active" : ""} onClick={() => setSelected(item)} type="button" key={item.id}><span><strong>{item.id}</strong><small>{item.orderId} · {formatDate(item.createdAt)}</small></span><b>{labels[item.status]}</b><em>{formatMoney(item.refundAmount)}</em></button>)}</aside>
      {selected && <article className="ops-panel ops-return-detail"><header><div><p>{selected.type === "exchange" ? "ĐỔI SẢN PHẨM" : "TRẢ HÀNG"}</p><h2>{selected.id}</h2><span>Đơn {selected.orderId} · {selected.order?.customer?.name}</span></div><b>{labels[selected.status]}</b></header><div className="ops-return-items">{selected.items.map((line) => <div key={`${line.productId}-${line.size}-${line.color}`}><ProductImage src={line.image} alt={line.name} /><span><strong>{line.name}</strong><small>{line.color} · Size {line.size} · SL {line.quantity}</small></span><b>{formatMoney(line.price * line.quantity)}</b></div>)}</div><section><span>Lý do khách hàng</span><p>{selected.reason}</p>{selected.note && <small>{selected.note}</small>}</section><footer><div><span>Số tiền dự kiến hoàn</span><strong>{formatMoney(selected.refundAmount)}</strong></div><div>{selected.status === "requested" && <><button className="ops-danger-button" onClick={() => update("rejected")} type="button">Từ chối</button><button className="ops-primary-button" onClick={() => update("approved")} type="button">Duyệt yêu cầu</button></>}{selected.status === "approved" && <button className="ops-primary-button" onClick={() => update("receiving")} type="button">Chờ nhận hàng về</button>}{selected.status === "receiving" && <button className="ops-primary-button" onClick={() => update("completed")} type="button">Hoàn tất & nhập kho</button>}</div></footer></article>}
    </section>}
    {!loading && !error && !items.length && <section className="ops-panel"><Empty title="Chưa có yêu cầu đổi trả" copy="Các yêu cầu hợp lệ từ khách hàng sẽ xuất hiện tại đây." /></section>}
  </div>;
}
