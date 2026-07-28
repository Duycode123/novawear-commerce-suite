import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, Modal, PageHeader, Status } from "../components/Ui";

export default function CategoriesPage() {
  const { user, notify } = useAdmin();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", status: "active" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.get("/admin/categories");
      setCategories(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = (category = null) => {
    setEditing(category);
    setCreating(!category);
    setForm(category ? { name: category.name, description: category.description, status: category.status } : { name: "", description: "", status: "active" });
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = editing
        ? await api.put(`/admin/categories/${editing.id}`, form)
        : await api.post("/admin/categories", form);
      notify(result.message);
      close();
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const remove = async (category) => {
    if (!window.confirm(`Xóa danh mục “${category.name}”?`)) return;
    try {
      const result = await api.delete(`/admin/categories/${category.id}`);
      notify(result.message);
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Catalog structure" title="Danh mục" copy="Tổ chức sản phẩm thành những nhóm rõ ràng cho cửa hàng." actions={user.role === "admin" && <button className="ops-primary-button" type="button" onClick={() => open()}>＋ Thêm danh mục</button>} />
      {loading && <Loading rows={4} />}
      {error && <ErrorPanel message={error} onRetry={load} />}
      {!loading && !error && categories.length > 0 && (
        <section className="ops-category-grid">
          {categories.map((category, index) => (
            <article key={category.id}>
              <header><span>0{index + 1}</span><Status value={category.status} type="category" /></header>
              <h2>{category.name}</h2>
              <p>{category.description}</p>
              <div><strong>{category.productCount}</strong><span>sản phẩm</span></div>
              <footer><button type="button" onClick={() => open(category)}>Chỉnh sửa →</button>{user.role === "admin" && !category.productCount && <button type="button" className="danger" onClick={() => remove(category)}>Xóa</button>}</footer>
            </article>
          ))}
        </section>
      )}
      {!loading && !error && !categories.length && <Empty title="Chưa có danh mục" copy="Tạo danh mục đầu tiên để sắp xếp sản phẩm." />}
      <Modal open={creating || Boolean(editing)} title={editing ? "Chỉnh sửa danh mục" : "Thêm danh mục"} onClose={close}>
        <form className="ops-simple-form" onSubmit={save}>
          <label className="ops-field"><span>Tên danh mục *</span><input required minLength={2} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label className="ops-field"><span>Mô tả</span><textarea rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
          {editing && <label className="ops-field"><span>Trạng thái</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="active">Hoạt động</option><option value="archived">Lưu trữ</option></select></label>}
          <div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={close}>Hủy</button><button className="ops-primary-button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu danh mục"}</button></div>
        </form>
      </Modal>
    </div>
  );
}
