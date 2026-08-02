import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { formatDate } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, Modal, PageHeader, Status } from "../components/Ui";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  roleTitle: "Nhân viên bán hàng",
  department: "Bán hàng",
  status: "active",
  joinDate: new Date().toISOString().slice(0, 10),
  shift: "09:00 - 18:00",
  address: "",
  createAccount: true,
  accountRole: "staff",
  temporaryPassword: "Welcome@2026!",
};

export default function EmployeesPage() {
  const { notify } = useAdmin();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ search });
      if (department) query.set("department", department);
      const result = await api.get(`/admin/employees?${query.toString()}`);
      setEmployees(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [search, department]);

  useEffect(() => {
    const timer = window.setTimeout(load, 220);
    return () => window.clearTimeout(timer);
  }, [load]);

  const departments = useMemo(() => [...new Set(employees.map((item) => item.department))], [employees]);
  const open = (employee = null) => {
    setSelected(employee);
    setFormOpen(true);
    setForm(employee ? { ...emptyForm, ...employee, createAccount: false } : emptyForm);
  };
  const close = () => {
    setSelected(null);
    setFormOpen(false);
    setForm(emptyForm);
  };
  const change = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = selected
        ? await api.put(`/admin/employees/${selected.id}`, form)
        : await api.post("/admin/employees", form);
      notify(result.message);
      close();
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const deactivate = async (employee) => {
    if (!window.confirm(`Ngừng hoạt động nhân viên ${employee.name} và khóa tài khoản liên quan?`)) return;
    try {
      const result = await api.delete(`/admin/employees/${employee.id}`);
      notify(result.message);
      close();
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Đội ngũ" title="Nhân viên" copy="Thông tin liên hệ, vai trò, ca làm và trạng thái tài khoản." actions={<button className="ops-primary-button" type="button" onClick={() => open()}>＋ Thêm nhân viên</button>} />
      <div className="ops-compact-summary">
        <div><strong>{employees.filter((item) => item.status === "active").length}</strong><span>Đang làm việc</span></div>
        <div><strong>{employees.filter((item) => item.status === "on_leave").length}</strong><span>Nghỉ phép</span></div>
        <div><strong>{employees.filter((item) => item.status === "inactive").length}</strong><span>Ngừng hoạt động</span></div>
      </div>
      <section className="ops-panel ops-list-panel">
        <div className="ops-list-toolbar"><div className="ops-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, mã, email..." /></div><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Tất cả phòng ban</option>{departments.map((item) => <option key={item}>{item}</option>)}</select><span>{employees.length} nhân viên</span></div>
        {loading && <Loading rows={6} />}
        {error && <ErrorPanel message={error} onRetry={load} />}
        {!loading && !error && employees.length > 0 && (
          <div className="ops-employee-list">
            {employees.map((employee, index) => (
              <article key={employee.id}>
                <span className="ops-employee-avatar" style={{ "--avatar-color": index }}>{employee.name.charAt(0)}</span>
                <div className="ops-employee-identity"><h2>{employee.name}</h2><p>{employee.employeeCode} · {employee.roleTitle}</p></div>
                <div><strong>{employee.department}</strong><span>{employee.shift}</span></div>
                <div><a href={`mailto:${employee.email}`}>{employee.email}</a><span>{employee.phone}</span></div>
                <div><Status value={employee.status} type="employee" /><span>Từ {formatDate(employee.joinDate)}</span></div>
                <button className="ops-row-action" type="button" onClick={() => open(employee)}>Chỉnh sửa</button>
              </article>
            ))}
          </div>
        )}
        {!loading && !error && !employees.length && <Empty title="Chưa có nhân viên" copy="Thêm hồ sơ đầu tiên để bắt đầu quản lý đội ngũ." />}
      </section>
      <Modal open={formOpen} title={selected ? "Hồ sơ nhân viên" : "Thêm nhân viên"} subtitle={selected?.employeeCode} onClose={close} wide>
        <form className="ops-simple-form" onSubmit={save}>
          <div className="ops-form-grid">
            <label className="ops-field ops-field--wide"><span>Họ và tên *</span><input name="name" required minLength={2} value={form.name} onChange={change} /></label>
            <label className="ops-field"><span>Email công việc *</span><input name="email" type="email" required value={form.email} onChange={change} /></label>
            <label className="ops-field"><span>Số điện thoại *</span><input name="phone" required value={form.phone} onChange={change} /></label>
            <label className="ops-field"><span>Chức danh</span><input name="roleTitle" value={form.roleTitle} onChange={change} /></label>
            <label className="ops-field"><span>Phòng ban</span><select name="department" value={form.department} onChange={change}><option>Bán hàng</option><option>Vận hành</option><option>Kho vận</option><option>Chăm sóc khách hàng</option><option>Marketing</option></select></label>
            <label className="ops-field"><span>Ngày gia nhập</span><input name="joinDate" type="date" value={form.joinDate} onChange={change} /></label>
            <label className="ops-field"><span>Ca làm việc</span><input name="shift" value={form.shift} onChange={change} /></label>
            <label className="ops-field"><span>Trạng thái</span><select name="status" value={form.status} onChange={change}><option value="active">Đang làm việc</option><option value="on_leave">Nghỉ phép</option><option value="inactive">Ngừng hoạt động</option></select></label>
            <label className="ops-field ops-field--wide"><span>Địa chỉ</span><textarea name="address" rows={2} value={form.address} onChange={change} /></label>
          </div>
          {!selected && (
            <div className="ops-account-create">
              <label className="ops-check"><input type="checkbox" name="createAccount" checked={form.createAccount} onChange={change} /><span>Tạo tài khoản đăng nhập NOVA OPS</span></label>
              {form.createAccount && <div className="ops-form-grid"><label className="ops-field"><span>Quyền tài khoản</span><select name="accountRole" value={form.accountRole} onChange={change}><option value="staff">Nhân viên</option><option value="admin">Quản trị viên</option></select></label><label className="ops-field"><span>Mật khẩu tạm</span><input name="temporaryPassword" type="password" required minLength={12} maxLength={128} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}" value={form.temporaryPassword} onChange={change} /><small>Ít nhất 12 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt. Người dùng phải đổi ngay lần đầu đăng nhập.</small></label></div>}
            </div>
          )}
          <div className="ops-form-actions">{selected && selected.status !== "inactive" && <button className="ops-danger-button" type="button" onClick={() => deactivate(selected)}>Ngừng hoạt động</button>}<div /><button className="ops-secondary-button" type="button" onClick={close}>Hủy</button><button className="ops-primary-button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu hồ sơ"}</button></div>
        </form>
      </Modal>
    </div>
  );
}
