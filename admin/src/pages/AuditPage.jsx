import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { formatDate } from "../config";
import { Empty, ErrorPanel, Loading, PageHeader } from "../components/Ui";

export default function AuditPage() {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setItems((await api.get("/admin/audit-logs")).data); } catch (e) { setError(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  return <div><PageHeader eyebrow="Security & compliance" title="Nhật ký hệ thống" copy="Dấu vết thay đổi quan trọng được lưu tự động và chỉ quản trị viên có thể xem." />
    <section className="ops-panel ops-list-panel">{loading && <Loading rows={8} />}{error && <ErrorPanel message={error} onRetry={load} />}{!loading && !error && items.length > 0 && <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Đối tượng</th><th>Mã dữ liệu</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{formatDate(item.at, true)}</td><td><strong>{item.actorName}</strong></td><td><code>{item.action}</code></td><td>{item.entity}</td><td>{item.entityId}</td></tr>)}</tbody></table></div>}{!loading && !error && !items.length && <Empty title="Chưa có nhật ký" copy="Các thay đổi mới sẽ được ghi lại tại đây." />}</section>
  </div>;
}
