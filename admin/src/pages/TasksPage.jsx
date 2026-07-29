import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { formatDate } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, Modal, PageHeader } from "../components/Ui";

const blank = { title: "", description: "", employeeId: "", priority: "medium", dueDate: "" };
export default function TasksPage() {
  const { notify } = useAdmin();
  const [items, setItems] = useState([]); const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const [tasks, team] = await Promise.all([api.get("/admin/tasks"), api.get("/admin/employees")]); setItems(tasks.data); setEmployees(team.data.filter((item) => item.status === "active")); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const save = async (event) => {
    event.preventDefault();
    try { const result = form.id ? await api.put(`/admin/tasks/${form.id}`, form) : await api.post("/admin/tasks", form); notify(result.message); setForm(null); load(); }
    catch (e) { notify(e.message, "error"); }
  };
  const remove = async (item) => {
    if (!window.confirm(`Xóa công việc “${item.title}”?`)) return;
    try { notify((await api.delete(`/admin/tasks/${item.id}`)).message); load(); } catch (e) { notify(e.message, "error"); }
  };
  return <div>
    <PageHeader eyebrow="People operations" title="Phân công công việc" copy="Giao việc, theo dõi hạn hoàn thành và tiến độ của từng nhân viên." actions={<button className="ops-primary-button" onClick={() => setForm(blank)} type="button">＋ Giao việc</button>} />
    <section className="ops-mini-stats"><div><span>Chưa bắt đầu</span><strong>{items.filter((i) => i.status === "todo").length}</strong></div><div><span>Đang làm</span><strong>{items.filter((i) => i.status === "in_progress").length}</strong></div><div><span>Hoàn tất</span><strong>{items.filter((i) => i.status === "done").length}</strong></div><div><span>Quá hạn</span><strong>{items.filter((i) => i.status !== "done" && new Date(i.dueDate) < new Date()).length}</strong></div></section>
    <section className="ops-panel ops-list-panel">{loading && <Loading rows={6} />}{error && <ErrorPanel message={error} onRetry={load} />}
      {!loading && !error && items.length > 0 && <div className="ops-task-board">{items.map((item) => <article className={`ops-work-card priority--${item.priority}`} key={item.id}><header><span>{item.priority === "high" ? "Gấp" : item.priority === "low" ? "Thấp" : "Bình thường"}</span><b>{item.status === "done" ? "Hoàn tất" : item.status === "in_progress" ? "Đang làm" : "Cần làm"}</b></header><h3>{item.title}</h3><p>{item.description || "Không có ghi chú bổ sung."}</p><footer><div><strong>{item.employee?.name}</strong><small>Hạn {formatDate(item.dueDate, true)}</small></div><div className="ops-row-actions"><button onClick={() => setForm({ ...item, dueDate: item.dueDate?.slice(0, 16) })} type="button">Sửa</button><button className="danger" onClick={() => remove(item)} type="button">×</button></div></footer></article>)}</div>}
      {!loading && !error && !items.length && <Empty title="Chưa có công việc" copy="Giao công việc đầu tiên cho đội ngũ." />}</section>
    <Modal open={Boolean(form)} title={form?.id ? "Chỉnh sửa công việc" : "Giao công việc mới"} onClose={() => setForm(null)}>
      {form && <form className="ops-simple-form" onSubmit={save}><label className="ops-field"><span>Tiêu đề</span><input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label className="ops-field"><span>Mô tả</span><textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="ops-form-grid"><label className="ops-field"><span>Nhân viên</span><select required value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}><option value="">Chọn nhân viên</option>{employees.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="ops-field"><span>Ưu tiên</span><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="low">Thấp</option><option value="medium">Bình thường</option><option value="high">Gấp</option></select></label><label className="ops-field ops-field--wide"><span>Hạn hoàn thành</span><input type="datetime-local" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label></div><div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={() => setForm(null)}>Hủy</button><button className="ops-primary-button" type="submit">Lưu công việc</button></div></form>}
    </Modal>
  </div>;
}
