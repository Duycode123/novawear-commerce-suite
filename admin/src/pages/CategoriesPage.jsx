import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, Modal, PageHeader, Status } from "../components/Ui";

const suggestedCategories = [
  { name: "Áo thun nam", description: "T-shirt, áo graphic và áo tank cho nam.", audience: "men" }, { name: "Áo polo nam", description: "Lịch sự vừa đủ cho ngày thường.", audience: "men" },
  { name: "Áo sơ mi nam", description: "Sơ mi đi làm và đi chơi cho nam.", audience: "men" }, { name: "Áo khoác nam", description: "Jacket, bomber và lớp ngoài cho nam.", audience: "men" },
  { name: "Áo nỉ & hoodie nam", description: "Lớp mặc ấm nhẹ, dễ phối.", audience: "men" }, { name: "Quần jeans nam", description: "Denim bền dáng cho mọi ngày.", audience: "men" },
  { name: "Quần kaki nam", description: "Gọn gàng, linh hoạt và dễ mặc.", audience: "men" }, { name: "Quần jogger nam", description: "Thoải mái cho nhịp sống năng động.", audience: "men" },
  { name: "Quần short nam", description: "Gọn nhẹ cho ngày nắng và vận động.", audience: "men" }, { name: "Đồ thể thao nam", description: "Trang phục chạy bộ, gym và vận động.", audience: "men" },
  { name: "Đồ bơi nam", description: "Nhanh khô, linh hoạt dưới nước.", audience: "men" }, { name: "Đồ lót nam", description: "Nền tảng thoải mái cho cả ngày.", audience: "men" },
  { name: "Phụ kiện nam", description: "Mũ, tất, túi và các điểm nhấn nhỏ.", audience: "men" }, { name: "Giày & dép nam", description: "Hoàn thiện trang phục nam.", audience: "men" },
  { name: "Áo thun nữ", description: "T-shirt và áo ôm mềm cho nữ.", audience: "women" }, { name: "Áo kiểu & blouse", description: "Áo nữ đi làm, đi chơi, dễ phối.", audience: "women" },
  { name: "Áo sơ mi nữ", description: "Sơ mi phom nữ tính và linh hoạt.", audience: "women" }, { name: "Áo khoác nữ", description: "Blazer, cardigan và jacket cho nữ.", audience: "women" },
  { name: "Áo nỉ & hoodie nữ", description: "Lớp mặc ấm nhẹ, năng động.", audience: "women" }, { name: "Quần jeans nữ", description: "Jeans skinny, straight và wide-leg.", audience: "women" },
  { name: "Quần legging nữ", description: "Co giãn tốt cho vận động mỗi ngày.", audience: "women" }, { name: "Quần short nữ", description: "Gọn nhẹ, thoáng và dễ phối.", audience: "women" },
  { name: "Chân váy", description: "Mini, midi và chân váy xếp ly.", audience: "women" }, { name: "Váy & đầm", description: "Váy liền và đầm cho nhiều dịp.", audience: "women" },
  { name: "Đồ thể thao nữ", description: "Bra, set tập và đồ vận động.", audience: "women" }, { name: "Đồ bơi nữ", description: "Bikini, đồ bơi liền thân và cover-up.", audience: "women" },
  { name: "Đồ mặc nhà nữ", description: "Êm mềm cho giờ thư giãn.", audience: "women" }, { name: "Đồ lót nữ", description: "Nội y và đồ mặc nền thoải mái.", audience: "women" },
  { name: "Phụ kiện nữ", description: "Túi, mũ, tất và điểm nhấn nhỏ.", audience: "women" }, { name: "Giày & dép nữ", description: "Hoàn thiện trang phục nữ.", audience: "women" },
];

export default function CategoriesPage() {
  const { user, notify } = useAdmin();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", audience: "all", status: "active" });
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
    setForm(category ? { name: category.name, description: category.description, audience: category.audience || "all", status: category.status } : { name: "", description: "", audience: "all", status: "active" });
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
  const addSuggested = async () => {
    const existing = new Set(categories.map((item) => item.name.trim().toLocaleLowerCase("vi-VN")));
    const missing = suggestedCategories.filter((item) => !existing.has(item.name.toLocaleLowerCase("vi-VN")));
    if (!missing.length) return notify("Các danh mục đề xuất đã có sẵn.");
    setSaving(true);
    try {
      for (const item of missing) {
        // Create sequentially so each category is safely persisted before the next one.
        // This also keeps audit history in the same order as the catalog setup.
        // eslint-disable-next-line no-await-in-loop
        await api.post("/admin/categories", item);
      }
      notify(`Đã thêm ${missing.length} danh mục vào database.`);
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Hàng hóa" title="Danh mục" copy="Sắp xếp sản phẩm theo nhóm hiển thị trên cửa hàng." actions={user.role === "admin" && <>{!categories.length && <button className="ops-secondary-button" type="button" disabled={saving} onClick={addSuggested}>Tạo danh mục mẫu</button>}<button className="ops-primary-button" type="button" onClick={() => open()}>＋ Thêm danh mục</button></>} />
      {loading && <Loading rows={4} />}
      {error && <ErrorPanel message={error} onRetry={load} />}
      {!loading && !error && categories.length > 0 && (
        <section className="ops-panel ops-category-list">
          <header><strong>Tên danh mục</strong><strong>Hiển thị</strong><strong>Sản phẩm</strong><strong>Trạng thái</strong><span /></header>
          {categories.map((category) => (
            <article key={category.id}>
              <div><h2>{category.name}</h2><p>{category.description || "Chưa có mô tả"}</p></div>
              <span>{category.audience === "men" ? "Nam" : category.audience === "women" ? "Nữ" : "Nam & Nữ"}</span>
              <strong>{category.productCount}</strong>
              <Status value={category.status} type="category" />
              <footer>{user.role === "admin" ? <><button type="button" onClick={() => open(category)}>Chỉnh sửa</button>{!category.productCount && <button type="button" className="danger" onClick={() => remove(category)}>Xóa</button>}</> : <span>Chỉ xem</span>}</footer>
            </article>
          ))}
        </section>
      )}
      {!loading && !error && !categories.length && <Empty title="Chưa có danh mục" copy="Tạo danh mục đầu tiên để sắp xếp sản phẩm." />}
      <Modal open={creating || Boolean(editing)} title={editing ? "Chỉnh sửa danh mục" : "Thêm danh mục"} onClose={close}>
        <form className="ops-simple-form" onSubmit={save}>
          <label className="ops-field"><span>Tên danh mục *</span><input required minLength={2} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label className="ops-field"><span>Mô tả</span><textarea rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
          <label className="ops-field"><span>Hiển thị trong menu</span><select value={form.audience} onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))}><option value="all">Nam và Nữ</option><option value="men">Chỉ Nam</option><option value="women">Chỉ Nữ</option></select></label>
          {editing && <label className="ops-field"><span>Trạng thái</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="active">Hoạt động</option><option value="archived">Lưu trữ</option></select></label>}
          <div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={close}>Hủy</button><button className="ops-primary-button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu danh mục"}</button></div>
        </form>
      </Modal>
    </div>
  );
}
