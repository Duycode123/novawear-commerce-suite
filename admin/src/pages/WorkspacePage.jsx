import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { formatDate, formatMoney } from "../config";
import { useAdmin } from "../context/AdminContext";
import { ErrorPanel, Loading, PageHeader, Status } from "../components/Ui";

export default function WorkspacePage() {
  const { notify } = useAdmin();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.get("/staff/workspace");
      setWorkspace(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const attendance = async (action) => {
    setWorking(true);
    try {
      const result = await api.post("/staff/attendance", { action });
      setWorkspace((current) => ({ ...current, attendance: result.data }));
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setWorking(false);
    }
  };

  const updateTask = async (task, status) => {
    try {
      const result = await api.patch(`/staff/tasks/${task.id}`, { status });
      setWorkspace((current) => ({
        ...current,
        tasks: current.tasks.map((item) => item.id === task.id ? result.data : item),
      }));
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="My workspace" title="Không gian nhân viên" copy="Ca làm, công việc và đơn cần xử lý của riêng bạn." />
      {loading && <Loading rows={5} />}
      {error && <ErrorPanel message={error} onRetry={load} />}
      {!loading && !error && workspace && (
        <>
          <section className="ops-workspace-hero">
            <div className="ops-workspace-person">
              <span>{workspace.employee.name.charAt(0)}</span>
              <div><p>Xin chào,</p><h2>{workspace.employee.name}</h2><small>{workspace.employee.roleTitle} · {workspace.employee.department}</small></div>
            </div>
            <div className="ops-shift-info"><span>Ca hôm nay</span><strong>{workspace.employee.shift}</strong><small>{workspace.attendance?.checkIn ? `Vào ca lúc ${workspace.attendance.checkIn}` : "Chưa chấm công"}</small></div>
            <div className="ops-attendance-actions">
              {!workspace.attendance?.checkIn && <button className="ops-primary-button" type="button" disabled={working} onClick={() => attendance("check_in")}>Bắt đầu ca →</button>}
              {workspace.attendance?.checkIn && !workspace.attendance?.checkOut && <button className="ops-primary-button" type="button" disabled={working} onClick={() => attendance("check_out")}>Kết thúc ca →</button>}
              {workspace.attendance?.checkOut && <div className="ops-shift-complete">✓ Đã hoàn thành ca lúc {workspace.attendance.checkOut}</div>}
            </div>
          </section>

          <section className="ops-workspace-stats">
            <div><span>Việc đang mở</span><strong>{workspace.tasks.filter((item) => item.status !== "done").length}</strong><small>Trong ca hôm nay</small></div>
            <div><span>Việc hoàn tất</span><strong>{workspace.tasks.filter((item) => item.status === "done").length}</strong><small>Tiến độ cá nhân</small></div>
            <div>
              <span>Đơn đang phụ trách</span>
              <strong>{workspace.summary?.assignedOrders ?? workspace.orderQueue.filter((item) => item.assigneeId === workspace.employee.id).length}</strong>
              <small>{workspace.summary?.availableOrders ?? workspace.orderQueue.filter((item) => !item.assigneeId).length} đơn chờ nhận</small>
            </div>
          </section>

          <section className="ops-workspace-grid">
            <article className="ops-panel ops-task-panel">
              <header><div><p>Checklist cá nhân</p><h2>Việc trong ca</h2></div><span>{workspace.tasks.filter((item) => item.status === "done").length}/{workspace.tasks.length} hoàn tất</span></header>
              <div className="ops-task-list">
                {workspace.tasks.map((task) => (
                  <div className={`ops-task ops-task--${task.status}`} key={task.id}>
                    <button type="button" aria-label={task.status === "done" ? "Đánh dấu chưa xong" : "Đánh dấu hoàn tất"} onClick={() => updateTask(task, task.status === "done" ? "todo" : "done")}>{task.status === "done" ? "✓" : ""}</button>
                    <div><strong>{task.title}</strong><p>{task.description}</p><span>Hạn {formatDate(task.dueDate, true)}</span></div>
                    <i className={`priority priority--${task.priority}`}>{task.priority === "high" ? "Gấp" : task.priority === "medium" ? "Vừa" : "Thấp"}</i>
                  </div>
                ))}
              </div>
            </article>

            <article className="ops-panel ops-my-orders">
              <header><div><p>Order queue</p><h2>Đơn cần xử lý</h2></div><Link to="/orders">Mở tất cả →</Link></header>
              {workspace.orderQueue.length ? workspace.orderQueue.map((order) => (
                <Link className="ops-my-order" to={`/orders?open=${order.id}`} key={order.id}>
                  <div><strong>{order.id}</strong><span>{order.customer.name} · {order.items.length} món</span></div>
                  <Status value={order.status} />
                  <b>{formatMoney(order.total)}</b>
                  <i>→</i>
                </Link>
              )) : <p className="ops-muted">Không có đơn nào trong hàng chờ của bạn.</p>}
            </article>
          </section>

          <section className="ops-workspace-note">
            <div><p className="ops-kicker">TEAM NOTE</p><h2>Trải nghiệm tốt nằm trong từng việc nhỏ.</h2><p>Kiểm tra kỹ size, màu và ghi chú trước khi đóng gói. Một phút kiểm tra có thể tiết kiệm cả một hành trình đổi trả.</p></div>
            <span>NOVA<br />CARE</span>
          </section>
        </>
      )}
    </div>
  );
}
