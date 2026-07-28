import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { formatMoney } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, Modal, PageHeader, ProductImage, Status } from "../components/Ui";

const emptyProduct = {
  name: "",
  sku: "",
  categoryId: "",
  price: "",
  comparePrice: "",
  cost: "",
  stock: "",
  status: "draft",
  featured: false,
  badge: "",
  image: "/Images/11-0_672x990.jpg",
  colorsText: "Đen, Trắng",
  sizesText: "S, M, L, XL",
  description: "",
  materials: "",
  care: "",
};

function formFromProduct(product) {
  if (!product) return emptyProduct;
  return {
    ...product,
    colorsText: (product.colors || []).join(", "),
    sizesText: (product.sizes || []).join(", "),
  };
}

export default function ProductsPage() {
  const { user, notify } = useAdmin();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (categoryId) query.set("categoryId", categoryId);
      if (status !== "all") query.set("status", status);
      const [productResult, categoryResult] = await Promise.all([
        api.get(`/admin/products?${query.toString()}`),
        api.get("/admin/categories"),
      ]);
      setProducts(productResult.data);
      setCategories(categoryResult.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, status]);

  useEffect(() => {
    const timer = window.setTimeout(load, 220);
    return () => window.clearTimeout(timer);
  }, [load]);

  const inventoryValue = useMemo(() => products.reduce((sum, item) => sum + item.cost * item.stock, 0), [products]);

  const openForm = (product = null) => {
    setFormOpen(true);
    setEditing(product);
    setForm(formFromProduct(product));
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyProduct);
  };

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price),
      comparePrice: Number(form.comparePrice || 0),
      cost: Number(form.cost || 0),
      stock: Number(form.stock || 0),
      colors: form.colorsText.split(",").map((item) => item.trim()).filter(Boolean),
      sizes: form.sizesText.split(",").map((item) => item.trim()).filter(Boolean),
      images: [form.image],
    };
    try {
      const result = editing
        ? await api.put(`/admin/products/${editing.id}`, payload)
        : await api.post("/admin/products", payload);
      notify(result.message);
      closeForm();
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Xóa hoặc lưu trữ “${product.name}”?`)) return;
    try {
      const result = await api.delete(`/admin/products/${product.id}`);
      notify(result.message);
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Catalog management"
        title="Sản phẩm"
        copy="Quản lý thông tin bán hàng, giá, hình ảnh và trạng thái hiển thị."
        actions={user.role === "admin" && <button className="ops-primary-button" type="button" onClick={() => openForm()}>＋ Thêm sản phẩm</button>}
      />

      <section className="ops-mini-stats">
        <div><span>Đang hiển thị</span><strong>{products.filter((item) => item.status === "active").length}</strong></div>
        <div><span>Bản nháp</span><strong>{products.filter((item) => item.status === "draft").length}</strong></div>
        <div><span>Tổng tồn</span><strong>{products.reduce((sum, item) => sum + item.stock, 0)}</strong></div>
        <div><span>Giá trị vốn</span><strong>{formatMoney(inventoryValue)}</strong></div>
      </section>

      <section className="ops-panel ops-list-panel">
        <div className="ops-list-toolbar">
          <div className="ops-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc SKU..." /></div>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Tất cả danh mục</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select>
          <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="active">Đang bán</option><option value="draft">Bản nháp</option><option value="archived">Lưu trữ</option></select>
          <span>{products.length} sản phẩm</span>
        </div>
        {loading && <Loading rows={6} />}
        {error && <ErrorPanel message={error} onRetry={load} />}
        {!loading && !error && products.length > 0 && (
          <div className="ops-table-wrap">
            <table className="ops-table ops-products-table">
              <thead><tr><th>Sản phẩm</th><th>SKU</th><th>Danh mục</th><th>Giá bán</th><th>Tồn kho</th><th>Trạng thái</th><th>Đã bán</th><th /></tr></thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td><div className="ops-product-cell"><ProductImage src={product.image} alt={product.name} /><div><strong>{product.name}</strong><small>{product.colors?.slice(0, 2).join(" · ")}</small></div></div></td>
                    <td><code>{product.sku}</code></td>
                    <td>{product.category?.name || "—"}</td>
                    <td><strong>{formatMoney(product.price)}</strong>{product.comparePrice > product.price && <small><del>{formatMoney(product.comparePrice)}</del></small>}</td>
                    <td><span className={`stock-number ${product.stock <= 20 ? "is-low" : ""}`}>{product.stock}</span></td>
                    <td><Status value={product.status} type="product" /></td>
                    <td>{product.sold}</td>
                    <td><div className="ops-row-actions"><button type="button" onClick={() => openForm(product)}>Sửa</button>{user.role === "admin" && <button type="button" className="danger" onClick={() => remove(product)}>×</button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && !products.length && <Empty title="Chưa có sản phẩm" copy="Thêm sản phẩm đầu tiên hoặc thay đổi bộ lọc." />}
      </section>

      <Modal open={formOpen} title={editing ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"} subtitle={editing ? editing.sku : "Tạo nội dung và thông tin bán hàng"} onClose={closeForm} wide>
        <form className="ops-product-form" onSubmit={save}>
          <div className="ops-product-form__preview">
            <ProductImage src={form.image} alt="Xem trước sản phẩm" />
            <p>Ảnh xem trước</p>
          </div>
          <div className="ops-product-form__fields">
            <div className="ops-form-grid">
              <label className="ops-field ops-field--wide"><span>Tên sản phẩm *</span><input name="name" required minLength={3} value={form.name} onChange={change} /></label>
              <label className="ops-field"><span>SKU *</span><input name="sku" required value={form.sku} onChange={change} placeholder="NVA-TS-009" /></label>
              <label className="ops-field"><span>Danh mục *</span><select name="categoryId" required value={form.categoryId} onChange={change}><option value="">Chọn danh mục</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
              <label className="ops-field"><span>Giá bán *</span><input name="price" type="number" min="0" required value={form.price} onChange={change} /></label>
              <label className="ops-field"><span>Giá so sánh</span><input name="comparePrice" type="number" min="0" value={form.comparePrice} onChange={change} /></label>
              <label className="ops-field"><span>Giá vốn</span><input name="cost" type="number" min="0" value={form.cost} onChange={change} /></label>
              <label className="ops-field"><span>Tồn kho</span><input name="stock" type="number" min="0" value={form.stock} onChange={change} /></label>
              <label className="ops-field"><span>Trạng thái</span><select name="status" value={form.status} onChange={change}><option value="draft">Bản nháp</option><option value="active">Đang bán</option><option value="archived">Lưu trữ</option></select></label>
              <label className="ops-field"><span>Nhãn sản phẩm</span><input name="badge" value={form.badge} onChange={change} placeholder="Mới / Bán chạy" /></label>
              <label className="ops-field ops-field--wide"><span>Đường dẫn ảnh *</span><input name="image" required value={form.image} onChange={change} placeholder="/Images/ten-anh.jpg" /></label>
              <label className="ops-field"><span>Màu sắc (cách nhau bằng dấu phẩy)</span><input name="colorsText" value={form.colorsText} onChange={change} /></label>
              <label className="ops-field"><span>Kích thước (cách nhau bằng dấu phẩy)</span><input name="sizesText" value={form.sizesText} onChange={change} /></label>
              <label className="ops-field ops-field--wide"><span>Mô tả</span><textarea name="description" rows={3} value={form.description} onChange={change} /></label>
              <label className="ops-field"><span>Chất liệu</span><textarea name="materials" rows={2} value={form.materials} onChange={change} /></label>
              <label className="ops-field"><span>Bảo quản</span><textarea name="care" rows={2} value={form.care} onChange={change} /></label>
            </div>
            <label className="ops-check"><input type="checkbox" name="featured" checked={Boolean(form.featured)} onChange={change} /><span>Hiển thị ở khu vực sản phẩm nổi bật</span></label>
            <div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={closeForm}>Hủy</button><button className="ops-primary-button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu sản phẩm →"}</button></div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
