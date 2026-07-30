import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { EmptyState, ErrorState, ProductCard, ProductGridSkeleton, SmartImage } from "../components/Common";
import { formatMoney } from "../config/site";

const lifestyleConfig = {
  "thuong-ngay": {
    index: "01",
    eyebrow: "EVERYDAY EDIT",
    title: <>Nhẹ nhàng<br /><em>mỗi ngày.</em></>,
    image: "/Images/nova-v3/home-story.png",
    imageAlt: "Trang phục NOVAWEAR dành cho ngày thường",
    intro: "Những thiết kế có phom thoải mái, màu sắc dễ kết hợp và chất liệu dễ chăm sóc cho lịch trình hằng ngày.",
    quote: "Một tủ đồ tốt bắt đầu từ những món bạn thực sự muốn mặc lại.",
    criteria: ["Phom linh hoạt", "Màu dễ phối", "Chất liệu dễ chăm sóc"],
    categorySlugs: [
      "ao-thun-nam", "ao-thun-nu", "ao-so-mi-nam", "ao-so-mi-nu", "ao-kieu-blouse",
      "quan-jeans-nam", "quan-jeans-nu", "quan-kaki-nam", "vay-dam",
    ],
    catalogHref: "/cua-hang?category=ao-thun-nam&inStock=true",
    catalogLabel: "Mua trang phục hằng ngày",
  },
  "van-dong": {
    index: "02",
    eyebrow: "MOTION EDIT",
    title: <>Sẵn sàng<br /><em>chuyển động.</em></>,
    image: "/Images/nova-v3/lifestyle-motion-hero.png",
    imageAlt: "Trang phục vận động NOVAWEAR",
    intro: "Trang phục nhẹ, co giãn và thoát ẩm để theo bạn từ buổi tập đến những ngày cần di chuyển liên tục.",
    quote: "Chuyển động tự nhiên bắt đầu từ một thiết kế không cản trở cơ thể.",
    criteria: ["Co giãn linh hoạt", "Thoát ẩm nhanh", "Nhẹ và thoáng"],
    categorySlugs: [
      "do-the-thao-nam", "do-the-thao-nu", "quan-jogger-nam", "quan-legging-nu",
      "quan-short-nam", "quan-short-nu", "do-boi-nam", "do-boi-nu",
    ],
    catalogHref: "/cua-hang?category=quan-short-nam&inStock=true",
    catalogLabel: "Mua trang phục vận động",
  },
  "cuoi-tuan": {
    index: "03",
    eyebrow: "WEEKEND EDIT",
    title: <>Chậm lại<br /><em>cuối tuần.</em></>,
    image: "/Images/nova-v3/about-team.png",
    imageAlt: "Trang phục cuối tuần NOVAWEAR",
    intro: "Những lớp đồ mềm, chỉn chu vừa đủ và dễ kết hợp cho buổi cà phê, cuộc hẹn hoặc một ngày thong thả trong phố.",
    quote: "Cuối tuần là lúc mặc đẹp theo cách không cần cố gắng.",
    criteria: ["Mềm và tự nhiên", "Chỉn chu vừa đủ", "Dễ mặc nhiều lớp"],
    categorySlugs: [
      "ao-polo-nam", "ao-khoac-nam", "ao-khoac-nu", "ao-so-mi-nam", "ao-so-mi-nu",
      "quan-jeans-nam", "quan-jeans-nu", "quan-kaki-nam", "chan-vay", "vay-dam",
    ],
    catalogHref: "/cua-hang?category=ao-so-mi-nam&inStock=true",
    catalogLabel: "Mua lựa chọn cuối tuần",
  },
};

function productMatches(product, config) {
  const categorySlug = product.category?.slug || product.categorySlug;
  return Boolean(categorySlug && config.categorySlugs.includes(categorySlug));
}

export default function LifestylePage() {
  const { style } = useParams();
  const config = lifestyleConfig[style];
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.get("/products?sort=rating&limit=100&inStock=true");
      const source = result.data || [];
      const matched = source.filter((product) => productMatches(product, config));
      setProducts(matched.slice(0, 8));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const insights = useMemo(() => {
    const prices = products.map((product) => Number(product.price)).filter(Number.isFinite);
    const audiences = new Set(products.map((product) => product.audience).filter(Boolean));
    return {
      count: products.length,
      fromPrice: prices.length ? Math.min(...prices) : 0,
      audiences: audiences.size,
    };
  }, [products]);

  if (!config) return <Navigate to="/" replace />;

  return (
    <main className={`lifestyle-page lifestyle-page--${style}`}>
      <header className="lifestyle-hero">
        <figure>
          <SmartImage src={config.image} alt={config.imageAlt} loading="eager" />
          <figcaption>NOVAWEAR / {config.eyebrow}</figcaption>
        </figure>
        <div className="lifestyle-hero__copy">
          <p className="eyebrow">{config.index} / {config.eyebrow}</p>
          <h1>{config.title}</h1>
          <p>{config.intro}</p>
          <div>
            <a href="#lua-chon-phu-hop">Khám phá lựa chọn <span>↓</span></a>
            <Link to={config.catalogHref}>Đến bộ lọc mua sắm <span>↗</span></Link>
          </div>
        </div>
      </header>

      <section className="lifestyle-manifesto">
        <div><span>{config.index}</span><p className="eyebrow">CHỌN THEO NHỊP SỐNG</p></div>
        <blockquote>{config.quote}</blockquote>
        <div className="lifestyle-manifesto__criteria">
          {config.criteria.map((item, index) => <p key={item}><span>0{index + 1}</span><strong>{item}</strong></p>)}
        </div>
      </section>

      <section className="lifestyle-products" id="lua-chon-phu-hop">
        <header>
          <div><p className="eyebrow">CURATED FROM LIVE CATALOG</p><h2>Lựa chọn phù hợp</h2><p>Sản phẩm được lấy trực tiếp từ danh mục hiện có và chỉ hiển thị khi còn hàng.</p></div>
          {!loading && !error && <dl>
            <div><dt>{insights.count}</dt><dd>sản phẩm chọn lọc</dd></div>
            <div><dt>{insights.fromPrice ? formatMoney(insights.fromPrice) : "—"}</dt><dd>giá bắt đầu</dd></div>
            <div><dt>{insights.audiences || "—"}</dt><dd>nhóm người mặc</dd></div>
          </dl>}
        </header>

        {error && <ErrorState message={error} onRetry={loadProducts} />}
        {loading
          ? <ProductGridSkeleton count={8} />
          : products.length > 0
            ? <div className="product-grid">{products.map((product) => <ProductCard product={product} key={product.id} />)}</div>
            : !error && (
              <EmptyState
                symbol="N"
                title="Chưa có sản phẩm phù hợp đang còn hàng"
                copy="NOVAWEAR chỉ hiển thị sản phẩm thuộc đúng nhóm phong cách này. Danh sách sẽ tự cập nhật khi quản trị viên bổ sung hàng vào các danh mục liên quan."
                action={<Link className="button button--dark" to={config.catalogHref}>Xem danh mục gần nhất</Link>}
              />
            )}

        <div className="lifestyle-products__cta">
          <div><p className="eyebrow">TIẾP TỤC MUA SẮM</p><h2>Xem toàn bộ lựa chọn trong cửa hàng.</h2></div>
          <Link className="button button--dark" to={config.catalogHref}>{config.catalogLabel} <span>→</span></Link>
        </div>
      </section>
    </main>
  );
}
