import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { formatDate } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, PageHeader, Status } from "../components/Ui";

export default function AccountsPage() {
  const { user: currentUser, notify } = useAdmin();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.get("/admin/users");
      setUsers(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (user, changes) => {
    try {
      const result = await api.patch(`/admin/users/${user.id}`, changes);
      setUsers((current) => current.map((item) => item.id === user.id ? result.data : item));
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Access control" title="Tài khoản" copy="Quản lý quyền truy cập của khách hàng, nhân viên và quản trị viên." />
      <section className="ops-panel ops-list-panel">
        {loading && <Loading rows={5} />}
        {error && <ErrorPanel message={error} onRetry={load} />}
        {!loading && !error && users.length > 0 && (
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead><tr><th>Người dùng</th><th>Email</th><th>Vai trò</th><th>Liên kết</th><th>Ngày tạo</th><th>Xác minh</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><div className="ops-customer-cell"><span>{user.name.charAt(0)}</span><div><strong>{user.name}</strong><small>{user.id}</small></div></div></td>
                    <td>{user.email}</td>
                    <td><select className="ops-inline-select" value={user.role} disabled={user.id === currentUser.id} onChange={(event) => update(user, { role: event.target.value })}><option value="customer">Khách hàng</option><option value="staff">Nhân viên</option><option value="admin">Quản trị viên</option></select></td>
                    <td>{user.employeeId || user.customerId || "—"}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <button
                        className={`ops-status-button ${user.verified ? "is-verified" : "is-pending"}`}
                        type="button"
                        disabled={user.id === currentUser.id}
                        onClick={() => update(user, { verified: !user.verified })}
                      >
                        {user.verified ? "Đã xác minh" : "Chờ xác minh"}
                      </button>
                    </td>
                    <td><button className="ops-status-button" type="button" disabled={user.id === currentUser.id} onClick={() => update(user, { status: user.status === "active" ? "inactive" : "active" })}><Status value={user.status} type="account" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && !users.length && <Empty title="Chưa có tài khoản" copy="Tài khoản mới sẽ xuất hiện tại đây." />}
      </section>
      <div className="ops-security-note"><span>!</span><div><strong>Lưu ý phân quyền</strong><p>Quản trị viên có toàn quyền; nhân viên xử lý bán hàng và kho; khách hàng chỉ truy cập cửa hàng. Không thể tự khóa tài khoản đang đăng nhập.</p></div></div>
    </div>
  );
}
