import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { formatMoney } from "../config/site";
import { ProductCard, SmartImage } from "../components/Common";

export default function PromotionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [promotions, setPromotions] = useState([]);
  const [saleProducts, setSaleProducts] = useState([]);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    Promise.all([api.get("/promotions"), api.get("/products?sale=true&sort=discount-desc&limit=100&view=card")])
      .then(([promotionResult, productResult]) => { setPromotions(promotionResult.data); setSaleProducts(productResult.data); })
      .catch((requestError) => setError(requestError.message));
  }, []);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);

  const describeOffer = (item) => item.type === "percent"
    ? `Giảm ${item.value}% cho đơn hàng của bạn`
    : item.type === "shipping"
      ? `Hỗ trợ phí giao hàng ${formatMoney(item.value)}`
      : `Giảm ngay ${formatMoney(item.value)}`;

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(""), 1800);
    } catch {
      setCopiedCode("");
    }
  };

  const featured = promotions[0];
  const saleCategories = useMemo(() => [...new Map(saleProducts.map((product) => [product.category?.slug, product.category])).values()].filter(Boolean), [saleProducts]);
  const requestedSaleCategory = searchParams.get("category") || "";
  const saleCategory = saleCategories.some((item) => item.slug === requestedSaleCategory)
    ? requestedSaleCategory
    : "";
  const selectSaleCategory = (categorySlug) => {
    const next = new URLSearchParams(searchParams);
    if (categorySlug) next.set("category", categorySlug);
    else next.delete("category");
    setSearchParams(next, { replace: true });
  };
  const saleCategoryGroups = useMemo(() => [
    { label: "Nam", items: saleCategories.filter((item) => item.audience === "men") },
    { label: "Nữ", items: saleCategories.filter((item) => item.audience === "women") },
    { label: "Dùng chung", items: saleCategories.filter((item) => item.audience !== "men" && item.audience !== "women") },
  ].filter((group) => group.items.length), [saleCategories]);
  const visibleSaleProducts = saleCategory ? saleProducts.filter((product) => product.category?.slug === saleCategory) : saleProducts;
  const deadline = useMemo(() => {
    const productDeadline = saleProducts.map((item) => item.saleEndsAt).filter(Boolean).map((item) => new Date(item).getTime()).filter((item) => item > now).sort((a, b) => a - b)[0];
    const couponDeadline = promotions.map((item) => new Date(item.expiresAt).getTime()).filter((item) => item > now).sort((a, b) => a - b)[0];
    return productDeadline || couponDeadline;
  }, [saleProducts, promotions, now]);
  const remaining = deadline ? Math.max(0, deadline - now) : 0;
  const clock = deadline ? [Math.floor(remaining / 3600000), Math.floor(remaining / 60000) % 60, Math.floor(remaining / 1000) % 60].map((value) => String(value).padStart(2, "0")) : null;

  return <div className="offers-page">
    <header className="offers-hero">
      <div className="offers-hero__copy">
        <p className="eyebrow">NOVA REWARDS</p>
        <h1>Mặc điều bạn thích.<br />Ưu đãi theo cách của bạn.</h1>
        <p>Chọn ưu đãi phù hợp cho đơn hàng của bạn.</p>
        <div className="offers-hero__actions"><Link className="button button--dark" to="/cua-hang">Khám phá sản phẩm <span>→</span></Link><a href="#uu-dai-hien-co">Xem mã đang có</a></div>
      </div>
      <div className="offers-hero__visual">
        <SmartImage src="/Images/nova-v3/promotions-women-color.webp" alt="Người mẫu nữ NOVAWEAR trong bộ suit đỏ burgundy" loading="eager" />
        <aside className="offers-feature" aria-label="Ưu đãi nổi bật">
          <span>ƯU ĐÃI NỔI BẬT</span>
          {featured ? <><strong>{featured.code}</strong><h2>{describeOffer(featured)}</h2><p>Cho đơn từ {formatMoney(featured.minOrder)}</p><button type="button" onClick={() => copyCode(featured.code)}>{copiedCode === featured.code ? "Đã sao chép" : "Sao chép mã"}</button></> : <><strong>NOVA</strong><h2>Quà tặng sẽ sớm trở lại.</h2><p>Hãy ghé lại sau để nhận ưu đãi mới nhất.</p></>}
        </aside>
      </div>
    </header>

    <div className="offers-content" id="uu-dai-hien-co">
      <div className="offers-section-heading"><div><p className="eyebrow">ƯU ĐÃI HÔM NAY</p><h2>Chọn một mã, hoàn thiện đơn hàng.</h2></div></div>
      {error && <p className="muted">{error}</p>}
      <div className="offers-grid">
        {promotions.map((item, index) => <article className="offer-card" key={item.code}>
          <div className="offer-card__top"><span>0{index + 1}</span><small>ÁP DỤNG ĐẾN {new Date(item.expiresAt).toLocaleDateString("vi-VN")}</small></div>
          <h3>{describeOffer(item)}</h3>
          <p>Đơn tối thiểu <strong>{formatMoney(item.minOrder)}</strong></p>
          <div className="offer-card__code"><code>{item.code}</code><button type="button" onClick={() => copyCode(item.code)}>{copiedCode === item.code ? "Đã chép" : "Sao chép"}</button></div>
        </article>)}
        {!error && !promotions.length && <p className="muted">Hiện chưa có ưu đãi đang áp dụng.</p>}
      </div>
      <section className="offers-sale-products" id="san-pham-uu-dai">
        <div className="offers-section-heading"><div><p className="eyebrow">GIÁ ĐANG GIẢM</p><h2>Sản phẩm ưu đãi</h2></div></div>
        {clock && <div className="sale-countdown"><span>Kết thúc sau</span><strong>{clock[0]}:{clock[1]}:{clock[2]}</strong><small>Giờ Việt Nam · {new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "medium", timeStyle: "short" }).format(new Date(deadline))}</small></div>}
        <div className="offers-sale-layout"><aside className="sale-category-tabs"><h3>Danh mục</h3><button className={!saleCategory ? "is-active" : ""} onClick={() => selectSaleCategory("")}>Tất cả</button>{saleCategoryGroups.map((group) => <div className="sale-category-group" key={group.label}><p>{group.label}</p>{group.items.map((category) => <button key={category.slug} className={saleCategory === category.slug ? "is-active" : ""} onClick={() => selectSaleCategory(category.slug)}>{category.name}</button>)}</div>)}</aside><div>{visibleSaleProducts.length ? <div className="product-grid">{visibleSaleProducts.map((product) => <div className="sale-product" key={product.id}><span>−{Math.round((1 - product.price / product.comparePrice) * 100)}%</span><ProductCard product={product} /></div>)}</div> : <p className="muted">Hiện chưa có sản phẩm ưu đãi.</p>}</div></div>
      </section>

      <section className="offers-note"><div><span>?</span><p><strong>Cần hỗ trợ về mã ưu đãi?</strong> Đội ngũ NOVAWEAR sẵn sàng kiểm tra điều kiện đơn hàng cho bạn.</p></div><Link to="/ho-tro">Đến trung tâm hỗ trợ →</Link></section>
    </div>
  </div>;
}
