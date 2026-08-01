import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { ErrorState, ProductCard, ProductGridSkeleton } from "../components/Common";
import { saveRecentSearch } from "../services/searchHistory";

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const filters = useMemo(() => ({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    sort: searchParams.get("sort") || "featured",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    audience: searchParams.get("audience") || "",
    color: searchParams.get("color") || "",
    size: searchParams.get("size") || "",
    inStock: searchParams.get("inStock") || "",
    page: searchParams.get("page") || "1",
  }), [searchParams]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    query.set("limit", "16");
    try {
      const result = await api.get(`/products?${query.toString()}`);
      setProducts(result.data);
      setPagination(result.pagination);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    api.get("/categories").then((result) => setCategories(result.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (filters.search) saveRecentSearch(filters.search);
  }, [filters.search]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  };

  const clearFilters = () => setSearchParams({});
  const selectedCategory = categories.find((item) => item.slug === filters.category);
  const categoryGroups = useMemo(() => {
    return [
      { key: "men", label: "Nam", items: categories.filter((item) => item.audience === "men") },
      { key: "women", label: "Nữ", items: categories.filter((item) => item.audience === "women") },
      { key: "all", label: "Dùng chung", items: categories.filter((item) => item.audience === "all") },
    ].filter((group) => group.items.length);
  }, [categories]);
  const allProductCount = useMemo(() => categories.reduce((sum, category) => sum + Number(category.productCount || 0), 0), [categories]);
  const availableColors = useMemo(() => [...new Set(products.flatMap((item) => item.colors || []))].slice(0, 10), [products]);
  const availableSizes = useMemo(() => [...new Set(products.flatMap((item) => item.sizes || []))].slice(0, 12), [products]);
  const selectCategory = (category, audience) => {
    const next = new URLSearchParams(searchParams);
    next.set("category", category.slug);
    if (audience === "men" || audience === "women") next.set("audience", audience);
    else next.delete("audience");
    next.delete("page");
    setSearchParams(next);
  };
  const clearCategory = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("category");
    next.delete("audience");
    next.delete("page");
    setSearchParams(next);
  };

  return (
    <div className="catalog-page">
      <header className="catalog-hero">
        <p className="eyebrow">NOVA collection</p>
        <h1>{selectedCategory?.name || (filters.search ? `Kết quả cho “${filters.search}”` : "Cửa hàng")}</h1>
        <p>{selectedCategory?.description || "Trang phục dễ mặc cho những ngày không giống nhau."}</p>
      </header>

      <div className="catalog-layout">
        <aside className={`catalog-filters ${filterOpen ? "is-open" : ""}`}>
          <div className="filter-heading">
            <h2>Bộ lọc</h2>
            <button type="button" onClick={clearFilters}>Xóa tất cả</button>
            <button className="filter-close" type="button" aria-label="Đóng bộ lọc" onClick={() => setFilterOpen(false)}>×</button>
          </div>

          <div className="filter-group">
            <h3>Danh mục</h3>
            <label className="radio-row radio-row--all">
              <input type="radio" name="category" checked={!filters.category} onChange={clearCategory} />
              <span>Tất cả</span><small>{allProductCount}</small>
            </label>
            <div className="catalog-category-groups">
              {categoryGroups.map((group) => <details className="catalog-category-group" open={!filters.audience || filters.audience === group.key} key={group.key}>
                <summary>{group.label}<small>{group.items.length} danh mục</small></summary>
                {group.items.map((category) => <label className="radio-row" key={category.id}>
                  <input type="radio" name="category" checked={filters.category === category.slug && (!category.audience || filters.audience === category.audience)} onChange={() => selectCategory(category, group.key)} />
                  <span>{category.name}</span><small>{category.productCount}</small>
                </label>)}
              </details>)}
            </div>
          </div>

          <div className="filter-group">
            <h3>Khoảng giá</h3>
            {[
              { label: "Dưới 350K", min: "", max: "350000" },
              { label: "350K – 550K", min: "350000", max: "550000" },
              { label: "Trên 550K", min: "550000", max: "" },
            ].map((range) => (
              <label className="radio-row" key={range.label}>
                <input
                  type="radio"
                  name="price"
                  checked={filters.minPrice === range.min && filters.maxPrice === range.max}
                  onChange={() => {
                    const next = new URLSearchParams(searchParams);
                    range.min ? next.set("minPrice", range.min) : next.delete("minPrice");
                    range.max ? next.set("maxPrice", range.max) : next.delete("maxPrice");
                    next.delete("page");
                    setSearchParams(next);
                  }}
                />
                <span>{range.label}</span>
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h3>Dành cho</h3>
            {[{ value: "", label: "Tất cả" }, { value: "men", label: "Nam" }, { value: "women", label: "Nữ" }, { value: "unisex", label: "Unisex" }].map((option) => (
              <label className="radio-row" key={option.label}><input type="radio" name="audience" checked={filters.audience === option.value} onChange={() => setFilter("audience", option.value)} /><span>{option.label}</span></label>
            ))}
          </div>
          {availableColors.length > 0 && <div className="filter-group"><h3>Màu sắc</h3><div className="filter-chips">{availableColors.map((value) => <button type="button" className={filters.color === value ? "is-active" : ""} key={value} onClick={() => setFilter("color", filters.color === value ? "" : value)}>{value}</button>)}</div></div>}
          {availableSizes.length > 0 && <div className="filter-group"><h3>Kích thước</h3><div className="filter-chips">{availableSizes.map((value) => <button type="button" className={filters.size === value ? "is-active" : ""} key={value} onClick={() => setFilter("size", filters.size === value ? "" : value)}>{value}</button>)}</div></div>}
          <label className="filter-stock"><input type="checkbox" checked={filters.inStock === "true"} onChange={(event) => setFilter("inStock", event.target.checked ? "true" : "")} /> Chỉ hiển thị sản phẩm còn hàng</label>

          <div className="filter-note">
            <span>↺</span>
            <p><strong>Đổi size miễn phí</strong>Trong 30 ngày từ khi nhận hàng.</p>
          </div>
        </aside>

        <section className="catalog-results">
          <div className="catalog-toolbar">
            <p><strong>{pagination.total}</strong> sản phẩm</p>
            <div>
              <button className="filter-trigger" type="button" onClick={() => setFilterOpen(true)}>Bộ lọc <span>＋</span></button>
              <label>
                <span>Sắp xếp</span>
                <select value={filters.sort} onChange={(event) => setFilter("sort", event.target.value)}>
                  <option value="featured">Nổi bật</option>
                  <option value="newest">Mới nhất</option>
                  <option value="popular">Bán chạy</option>
                  <option value="rating">Đánh giá cao</option>
                  <option value="price-asc">Giá thấp đến cao</option>
                  <option value="price-desc">Giá cao đến thấp</option>
                </select>
              </label>
            </div>
          </div>

          {(filters.search || filters.category || filters.minPrice || filters.maxPrice || filters.audience || filters.color || filters.size || filters.inStock) && (
            <div className="active-filters">
              {filters.search && <button type="button" onClick={() => setFilter("search", "")}>“{filters.search}” ×</button>}
              {filters.category && <button type="button" onClick={() => setFilter("category", "")}>{selectedCategory?.name || filters.category} ×</button>}
              {(filters.minPrice || filters.maxPrice) && <button type="button" onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete("minPrice");
                next.delete("maxPrice");
                setSearchParams(next);
              }}>Khoảng giá ×</button>}
            </div>
          )}

          {loading && <ProductGridSkeleton count={16} />}
          {error && <ErrorState message={error} onRetry={loadProducts} />}
          {!loading && !error && products.length > 0 && (
            <>
              <div className="product-grid product-grid--catalog">
                {products.map((product) => <ProductCard product={product} key={product.id} />)}
              </div>
              {pagination.totalPages > 1 && (
                <nav className="pagination" aria-label="Phân trang">
                  <button type="button" disabled={pagination.page <= 1} onClick={() => setFilter("page", String(pagination.page - 1))}>←</button>
                  {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      type="button"
                      className={pagination.page === page ? "is-active" : ""}
                      onClick={() => setFilter("page", String(page))}
                      key={page}
                    >
                      {page}
                    </button>
                  ))}
                  <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setFilter("page", String(pagination.page + 1))}>→</button>
                </nav>
              )}
            </>
          )}
          {!loading && !error && products.length === 0 && (
            <div className="catalog-empty">
              <span>⌕</span>
              <h2>Chưa tìm thấy món phù hợp</h2>
              <p>Thử từ khóa ngắn hơn hoặc bỏ bớt bộ lọc nhé.</p>
              <button className="button button--dark" type="button" onClick={clearFilters}>Xem tất cả sản phẩm</button>
            </div>
          )}
        </section>
      </div>
      {filterOpen && <button className="filter-backdrop" aria-label="Đóng bộ lọc" type="button" onClick={() => setFilterOpen(false)} />}
    </div>
  );
}
