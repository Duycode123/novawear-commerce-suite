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
  saleEndsAt: "",
  cost: "",
  stock: "",
  status: "draft",
  featured: false,
  audience: "unisex",
  badge: "",
  image: "/Images/11-0_672x990.jpg",
  imagesText: "/Images/11-0_672x990.jpg",
  colorsText: "Đen, Trắng",
  sizesText: "S, M, L, XL",
  variantsText: "",
  description: "",
  longDescription: "",
  materials: "",
  care: "",
  fit: "",
  suitableFor: "",
  modelInfo: "",
  origin: "",
  highlightsText: "",
  featureDetailsText: "",
};

const PRODUCT_PAGE_SIZE = 24;

function formFromProduct(product) {
  if (!product) return emptyProduct;
  return {
    ...product,
    colorsText: (product.colors || []).join(", "),
    sizesText: (product.sizes || []).join(", "),
    variantsText: (product.variants || []).map((item) => `${item.size} | ${item.color} | ${item.stock}`).join("\n"),
    highlightsText: (product.highlights || []).join(", "),
    featureDetailsText: (product.featureDetails || []).map((item) => `${item.title} | ${item.description}`).join("\n"),
    imagesText: (product.images?.length ? product.images : [product.image]).filter(Boolean).join("\n"),
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
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({ active: 0, draft: 0, totalStock: 0, inventoryValue: 0 });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadsEnabled, setUploadsEnabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (categoryId) query.set("categoryId", categoryId);
      if (status !== "all") query.set("status", status);
      query.set("page", String(page));
      query.set("limit", String(PRODUCT_PAGE_SIZE));
      const [productResult, categoryResult] = await Promise.all([
        api.get(`/admin/products?${query.toString()}`),
        api.get("/admin/categories"),
      ]);
      setProducts(productResult.data);
      setPagination(productResult.pagination || { page: 1, total: productResult.data.length, totalPages: 1 });
      setSummary(productResult.summary || {
        active: productResult.data.filter((item) => item.status === "active").length,
        draft: productResult.data.filter((item) => item.status === "draft").length,
        totalStock: productResult.data.reduce((sum, item) => sum + Number(item.stock || 0), 0),
        inventoryValue: productResult.data.reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.stock || 0), 0),
      });
      if (productResult.pagination?.page && productResult.pagination.page !== page) setPage(productResult.pagination.page);
      setCategories(categoryResult.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, status, page]);

  useEffect(() => {
    const timer = window.setTimeout(load, 220);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    api.get("/config")
      .then((result) => setUploadsEnabled(Boolean(result.integrations?.uploads)))
      .catch(() => setUploadsEnabled(false));
  }, []);

  const pageNumbers = useMemo(() => {
    const totalPages = Math.max(1, Number(pagination.totalPages || 1));
    let start = Math.max(1, Number(pagination.page || 1) - 2);
    const end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [pagination.page, pagination.totalPages]);

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

  const uploadProductImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.upload("/uploads/product", file);
      setForm((current) => ({
        ...current,
        image: result.data.url,
        imagesText: [current.imagesText, result.data.url].filter(Boolean).join("\n"),
      }));
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price),
      comparePrice: Number(form.comparePrice || 0),
      saleEndsAt: form.saleEndsAt ? new Date(form.saleEndsAt).toISOString() : "",
      cost: Number(form.cost || 0),
      stock: Number(form.stock || 0),
      colors: form.colorsText.split(",").map((item) => item.trim()).filter(Boolean),
      sizes: form.sizesText.split(",").map((item) => item.trim()).filter(Boolean),
      variants: form.variantsText.split("\n").map((line) => {
        const [size, color, stock] = line.split("|").map((item) => item.trim());
        return { size, color, stock: Number(stock || 0) };
      }).filter((item) => item.size || item.color),
      highlights: form.highlightsText.split(",").map((item) => item.trim()).filter(Boolean),
      featureDetails: form.featureDetailsText.split("\n").map((line) => { const [title, ...rest] = line.split("|"); return { title: title?.trim(), description: rest.join("|").trim() }; }).filter((item) => item.title && item.description),
      images: form.imagesText.split("\n").map((item) => item.trim()).filter(Boolean),
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
        <div><span>Đang bán</span><strong>{Number(summary.active || 0).toLocaleString("vi-VN")}</strong></div>
        <div><span>Bản nháp</span><strong>{Number(summary.draft || 0).toLocaleString("vi-VN")}</strong></div>
        <div><span>Tổng tồn</span><strong>{Number(summary.totalStock || 0).toLocaleString("vi-VN")}</strong></div>
        <div><span>Giá trị vốn</span><strong>{formatMoney(summary.inventoryValue || 0)}</strong></div>
      </section>

      <section className="ops-panel ops-list-panel">
        <div className="ops-list-toolbar">
          <div className="ops-search"><span>⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm tên hoặc SKU..." /></div>
          <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }}><option value="">Tất cả danh mục</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">Tất cả trạng thái</option><option value="active">Đang bán</option><option value="draft">Bản nháp</option><option value="archived">Lưu trữ</option></select>
          <span>{Number(pagination.total || 0).toLocaleString("vi-VN")} sản phẩm</span>
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
        {!loading && !error && pagination.totalPages > 1 && (
          <nav className="ops-pagination" aria-label="Phân trang sản phẩm">
            <button type="button" disabled={pagination.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← Trước</button>
            <div>
              {pageNumbers.map((pageNumber) => (
                <button type="button" className={pagination.page === pageNumber ? "is-active" : ""} onClick={() => setPage(pageNumber)} key={pageNumber}>{pageNumber}</button>
              ))}
            </div>
            <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}>Sau →</button>
          </nav>
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
              <label className="ops-field"><span>Kết thúc ưu đãi (giờ Việt Nam)</span><input name="saleEndsAt" type="datetime-local" value={form.saleEndsAt ? form.saleEndsAt.slice(0, 16) : ""} onChange={change} /></label>
              <label className="ops-field"><span>Giá vốn</span><input name="cost" type="number" min="0" value={form.cost} onChange={change} /></label>
              <label className="ops-field"><span>Tồn kho</span><input name="stock" type="number" min="0" value={form.stock} onChange={change} /></label>
              <label className="ops-field"><span>Trạng thái</span><select name="status" value={form.status} onChange={change}><option value="draft">Bản nháp</option><option value="active">Đang bán</option><option value="archived">Lưu trữ</option></select></label>
              <label className="ops-field"><span>Dành cho</span><select name="audience" value={form.audience} onChange={change}><option value="men">Nam</option><option value="women">Nữ</option><option value="unisex">Unisex</option></select></label>
              <label className="ops-field"><span>Nhãn sản phẩm</span><input name="badge" value={form.badge} onChange={change} placeholder="Mới / Bán chạy" /></label>
              <label className="ops-field ops-field--wide"><span>Đường dẫn ảnh *</span><input name="image" required value={form.image} onChange={change} placeholder="/Images/ten-anh.jpg" /></label>
              {uploadsEnabled && <label className="ops-field ops-field--wide"><span>Tải ảnh lên Cloudinary</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={uploadProductImage} disabled={uploading} /><small>{uploading ? "Đang tải và tối ưu ảnh…" : "Tối đa 12MB. Ảnh tải lên sẽ tự điền vào đường dẫn và thư viện ảnh."}</small></label>}
              <label className="ops-field ops-field--wide"><span>Thư viện ảnh (mỗi dòng một đường dẫn)</span><textarea name="imagesText" rows={4} value={form.imagesText} onChange={change} placeholder={"/Images/anh-chinh.jpg\n/Images/anh-chi-tiet.jpg"} /></label>
              <label className="ops-field"><span>Màu sắc (cách nhau bằng dấu phẩy)</span><input name="colorsText" value={form.colorsText} onChange={change} /></label>
              <label className="ops-field"><span>Kích thước (cách nhau bằng dấu phẩy)</span><input name="sizesText" value={form.sizesText} onChange={change} /></label>
              <label className="ops-field ops-field--wide"><span>Tồn kho theo biến thể (mỗi dòng: Size | Màu | Số lượng)</span><textarea name="variantsText" rows={6} value={form.variantsText} onChange={change} placeholder={"S | Đen | 10\nM | Đen | 14\nL | Trắng | 8"} /><small>Khi có dữ liệu biến thể, tổng tồn kho được tính tự động từ các dòng này.</small></label>
              <label className="ops-field ops-field--wide"><span>Mô tả</span><textarea name="description" rows={3} value={form.description} onChange={change} /></label>
              <label className="ops-field ops-field--wide"><span>Mô tả dài bên dưới ảnh</span><textarea name="longDescription" rows={6} value={form.longDescription} onChange={change} placeholder="Giới thiệu chi tiết về thiết kế, trải nghiệm mặc và hoàn cảnh sử dụng..." /></label>
              <label className="ops-field"><span>Chất liệu</span><textarea name="materials" rows={2} value={form.materials} onChange={change} /></label>
              <label className="ops-field"><span>Bảo quản</span><textarea name="care" rows={2} value={form.care} onChange={change} /></label>
              <label className="ops-field"><span>Phom dáng & cảm giác mặc</span><textarea name="fit" rows={2} value={form.fit} onChange={change} /></label>
              <label className="ops-field"><span>Phù hợp sử dụng</span><textarea name="suitableFor" rows={2} value={form.suitableFor} onChange={change} placeholder="Đi làm, đi chơi, tập luyện..." /></label>
              <label className="ops-field"><span>Thông tin người mẫu</span><textarea name="modelInfo" rows={2} value={form.modelInfo} onChange={change} placeholder="Chiều cao, cân nặng, số đo và size đang mặc" /></label>
              <label className="ops-field"><span>Xuất xứ</span><input name="origin" value={form.origin} onChange={change} /></label>
              <label className="ops-field ops-field--wide"><span>Điểm nổi bật (cách nhau bằng dấu phẩy)</span><textarea name="highlightsText" rows={3} value={form.highlightsText} onChange={change} /></label>
              <label className="ops-field ops-field--wide"><span>Nội dung tính năng (mỗi dòng: Tiêu đề | Mô tả)</span><textarea name="featureDetailsText" rows={6} value={form.featureDetailsText} onChange={change} placeholder={"Co giãn linh hoạt | Hỗ trợ chuyển động tự nhiên trong ngày.\nDễ phối đồ | Phù hợp nhiều phong cách và hoàn cảnh."} /></label>
            </div>
            <label className="ops-check"><input type="checkbox" name="featured" checked={Boolean(form.featured)} onChange={change} /><span>Hiển thị ở khu vực sản phẩm nổi bật</span></label>
            <div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={closeForm}>Hủy</button><button className="ops-primary-button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu sản phẩm →"}</button></div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
