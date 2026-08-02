import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  stock: "0",
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
// Keep the original file when it is uploaded.  The minimum edge is
// configurable so demo catalogs can accept small source images as well.
const PRODUCT_IMAGE_MIN_EDGE = Math.max(
  0,
  Number.parseInt(process.env.REACT_APP_UPLOAD_PRODUCT_MIN_EDGE_PX || "0", 10) || 0,
);
const PRODUCT_IMAGE_MAX_BYTES = 12 * 1024 * 1024;

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const dimensions = {
        width: Number(image.naturalWidth || 0),
        height: Number(image.naturalHeight || 0),
      };
      URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Không đọc được kích thước ảnh. Vui lòng chọn ảnh JPEG, PNG, WebP hoặc AVIF hợp lệ."));
    };
    image.src = objectUrl;
  });
}

function slugText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function makeSku(name, categoryId, categories, seed) {
  const productPart = slugText(name).split("-").filter(Boolean).slice(0, 3).join("").slice(0, 10).toUpperCase() || "ITEM";
  const category = categories.find((item) => item.id === categoryId);
  const categoryPart = slugText(category?.slug || category?.name).split("-").filter(Boolean)[0]?.slice(0, 5).toUpperCase() || "GEN";
  return `NVA-${categoryPart}-${productPart}-${seed}`;
}

function productSuggestions(form, categories) {
  const category = categories.find((item) => item.id === form.categoryId);
  const categoryName = category?.name || (form.audience === "women" ? "danh mục nữ" : form.audience === "men" ? "danh mục nam" : "danh mục thời trang");
  const name = form.name.trim() || "Sản phẩm NOVAWEAR";
  const audienceText = form.audience === "women" ? "nữ" : form.audience === "men" ? "nam" : "unisex";
  return {
    description: `${name} thuộc ${categoryName.toLowerCase()}, thiết kế dễ mặc và phù hợp với nhịp sống hằng ngày.`,
    longDescription: `${name} được phát triển cho khách hàng ${audienceText} yêu thích phong cách gọn gàng, linh hoạt. Phom dáng cân bằng, dễ phối cùng các sản phẩm cơ bản và phù hợp nhiều hoàn cảnh sử dụng.`,
    materials: "Cập nhật theo chất liệu thực tế của từng lô hàng.",
    care: "Giặt theo hướng dẫn trên nhãn sản phẩm, ưu tiên giặt nhẹ và phơi nơi thoáng mát.",
    fit: "Phom dễ mặc, thoải mái khi vận động và phù hợp nhiều vóc dáng.",
    suitableFor: "Đi làm, đi chơi và sử dụng hằng ngày.",
    modelInfo: "Cập nhật khi có thông tin người mẫu thực tế.",
    origin: "Việt Nam",
    highlightsText: "Phom dễ mặc, Dễ phối đồ, Thiết kế linh hoạt",
    featureDetailsText: "Thiết kế | Tối giản, dễ kết hợp với tủ đồ hiện có.\nTrải nghiệm mặc | Ưu tiên sự thoải mái trong các hoạt động hằng ngày.\nBảo quản | Thực hiện theo hướng dẫn trên nhãn để giữ phom và màu sắc.",
  };
}

function formFromProduct(product) {
  if (!product) return { ...emptyProduct };
  return {
    ...product,
    saleEndsAt: toDateTimeLocal(product.saleEndsAt),
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
  const [form, setForm] = useState({ ...emptyProduct });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [skuAuto, setSkuAuto] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadsEnabled, setUploadsEnabled] = useState(false);
  const skuSeed = useRef(String(Date.now()).slice(-5));

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
    skuSeed.current = String(Date.now()).slice(-5);
    setSkuAuto(!product);
    setAdvancedOpen(Boolean(product?.longDescription || product?.variants?.length));
    setForm(formFromProduct(product));
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm({ ...emptyProduct });
    setAdvancedOpen(false);
    setSkuAuto(true);
  };

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === "sku") setSkuAuto(false);
    setForm((current) => {
      const next = { ...current, [name]: type === "checkbox" ? checked : value };
      if (!editing && skuAuto && (name === "name" || name === "categoryId")) {
        next.sku = makeSku(next.name, next.categoryId, categories, skuSeed.current);
      }
      if (!editing && name === "categoryId") {
        const category = categories.find((item) => item.id === value);
        if (category?.audience === "men" || category?.audience === "women") next.audience = category.audience;
      }
      return next;
    });
  };

  const regenerateSku = () => {
    setSkuAuto(true);
    setForm((current) => ({ ...current, sku: makeSku(current.name, current.categoryId, categories, skuSeed.current) }));
  };

  const fillSuggestedDetails = () => {
    const suggestions = productSuggestions(form, categories);
    setForm((current) => ({
      ...current,
      ...Object.fromEntries(Object.entries(suggestions).map(([key, value]) => [key, current[key] || value])),
    }));
    setAdvancedOpen(true);
    notify("Đã điền nội dung gợi ý. Bạn có thể chỉnh lại trước khi lưu.");
  };

  const uploadProductImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      notify("Ảnh vượt quá 12MB. Hãy xuất lại ảnh ở chất lượng cao với dung lượng nhỏ hơn 12MB.", "error");
      event.target.value = "";
      return;
    }
    let dimensions;
    try {
      dimensions = await readImageDimensions(file);
    } catch (imageError) {
      notify(imageError.message, "error");
      event.target.value = "";
      return;
    }
    if (PRODUCT_IMAGE_MIN_EDGE > 0
      && (dimensions.width < PRODUCT_IMAGE_MIN_EDGE || dimensions.height < PRODUCT_IMAGE_MIN_EDGE)) {
      notify(
        `Ảnh chỉ có ${dimensions.width}×${dimensions.height}px. Hãy dùng ảnh có mỗi cạnh từ ${PRODUCT_IMAGE_MIN_EDGE}px để không bị mờ.`,
        "error",
      );
      event.target.value = "";
      return;
    }
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
      sku: form.sku || makeSku(form.name, form.categoryId, categories, skuSeed.current),
      image: form.image || emptyProduct.image,
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
      images: (form.imagesText || form.image || emptyProduct.image).split("\n").map((item) => item.trim()).filter(Boolean),
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
                    <td>{user.role === "admin" ? <div className="ops-row-actions"><button type="button" onClick={() => openForm(product)}>Sửa</button><button type="button" className="danger" onClick={() => remove(product)}>×</button></div> : <span>Chỉ xem</span>}</td>
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
            <p>{form.image ? "Ảnh xem trước" : "Ảnh mặc định sẽ được dùng nếu chưa tải ảnh"}</p>
          </div>
          <div className="ops-product-form__fields">
            <div className="ops-product-quick-guide">
              <div>
                <p>THÊM NHANH</p>
                <strong>Chỉ cần tên, danh mục và giá bán.</strong>
                <small>SKU, tồn kho mặc định và ảnh dự phòng đã có sẵn. Nội dung chi tiết có thể tạo gợi ý tự động.</small>
              </div>
              <button className="ops-secondary-button" type="button" onClick={fillSuggestedDetails}>✦ Tự điền nội dung</button>
            </div>
            <div className="ops-form-grid">
              <label className="ops-field ops-field--wide"><span>Tên sản phẩm *</span><input name="name" required minLength={3} value={form.name} onChange={change} /></label>
              <label className="ops-field"><span>SKU *</span><input name="sku" required value={form.sku} onChange={change} placeholder="NVA-TS-009" /></label>
              <label className="ops-field"><span>Danh mục *</span><select name="categoryId" required value={form.categoryId} onChange={change}><option value="">Chọn danh mục</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
              <label className="ops-field"><span>Giá bán *</span><input name="price" type="number" min="0" required value={form.price} onChange={change} /></label>
              {advancedOpen && <>
              <label className="ops-field"><span>Giá so sánh</span><input name="comparePrice" type="number" min="0" value={form.comparePrice} onChange={change} /></label>
              <label className="ops-field"><span>Kết thúc ưu đãi (giờ Việt Nam)</span><input name="saleEndsAt" type="datetime-local" value={form.saleEndsAt ? form.saleEndsAt.slice(0, 16) : ""} onChange={change} /></label>
              <label className="ops-field"><span>Giá vốn</span><input name="cost" type="number" min="0" value={form.cost} onChange={change} /></label>
              </>}
              <label className="ops-field"><span>Tồn kho ban đầu</span><input name="stock" type="number" min="0" value={form.stock} onChange={change} placeholder="0" /></label>
              <label className="ops-field"><span>Trạng thái</span><select name="status" value={form.status} onChange={change}><option value="draft">Bản nháp</option><option value="active">Đang bán</option><option value="archived">Lưu trữ</option></select></label>
              <label className="ops-field"><span>Dành cho</span><select name="audience" value={form.audience} onChange={change}><option value="men">Nam</option><option value="women">Nữ</option><option value="unisex">Unisex</option></select></label>
              <label className="ops-field"><span>Nhãn sản phẩm</span><input name="badge" value={form.badge} onChange={change} placeholder="Mới / Bán chạy" /></label>
              {advancedOpen && <>
              <label className="ops-field ops-field--wide"><span>Đường dẫn ảnh</span><input name="image" value={form.image} onChange={change} placeholder="Bỏ trống để dùng ảnh mặc định" /></label>
  {uploadsEnabled && <label className="ops-field ops-field--wide"><span>Tải ảnh gốc lên Cloudinary</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={uploadProductImage} disabled={uploading} /><small>{uploading ? "Đang tải ảnh gốc, không nén giảm chất lượng…" : PRODUCT_IMAGE_MIN_EDGE > 0 ? `Khuyên dùng ảnh dọc 1600×2000px trở lên; mỗi cạnh tối thiểu ${PRODUCT_IMAGE_MIN_EDGE}px, tối đa 12MB.` : "Ảnh nhỏ vẫn được nhận trong chế độ demo; tối đa 12MB. Ảnh gốc được giữ nguyên nhưng có thể mờ khi hiển thị lớn."}</small></label>}
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
              </>}
            </div>
            <div className="ops-product-auto-row">
              <span><small>SKU tự sinh</small><strong>{form.sku || "Nhập tên để tạo mã SKU"}</strong></span>
              <button type="button" onClick={regenerateSku}>Tạo lại SKU</button>
            </div>
            <div className="ops-product-advanced-toggle">
              <button type="button" onClick={() => setAdvancedOpen((current) => !current)}>{advancedOpen ? "⌃ Thu gọn thông tin nâng cao" : "⌄ Mở thông tin nâng cao"}</button>
              <span>Không bắt buộc khi tạo sản phẩm nhanh</span>
            </div>
            <label className="ops-check"><input type="checkbox" name="featured" checked={Boolean(form.featured)} onChange={change} /><span>Hiển thị ở khu vực sản phẩm nổi bật</span></label>
            <div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={closeForm}>Hủy</button><button className="ops-primary-button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu sản phẩm →"}</button></div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
