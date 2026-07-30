import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { ErrorState, ProductCard, ProductGridSkeleton, SmartImage } from "../components/Common";
import { useShop } from "../context/ShopContext";

const categoryPriority = [
  "ao-thun-nam",
  "ao-kieu-blouse",
  "ao-so-mi-nam",
  "vay-dam",
  "quan-short-nam",
  "ao-khoac-nu",
];

const categoryFallbackImages = {
  "ao-thun-nam": "/Images/nova-v3/product-tee-black.png",
  "ao-so-mi-nam": "/Images/nova-v3/product-shirt-blue.png",
  "ao-khoac-nam": "/Images/nova-v3/product-jacket-black.png",
  "quan-short-nam": "/Images/nova-v3/product-short-navy.png",
  "ao-thun-nu": "/Images/nova-v3/home-category-women-color.png",
  "ao-kieu-blouse": "/Images/nova-v3/home-category-women-color.png",
  "ao-khoac-nu": "/Images/nova-v3/product-jacket-black.png",
  "vay-dam": "/Images/nova-v3/home-category-women-color.png",
};

const benefits = [
  { mark: "↗", title: "Miễn phí vận chuyển", copy: "Áp dụng cho đơn từ 699.000đ" },
  { mark: "↺", title: "Đổi size trong 30 ngày", copy: "Miễn phí cho lần đổi đầu tiên" },
  { mark: "◇", title: "Thanh toán an toàn", copy: "COD hoặc chuyển khoản SePay" },
  { mark: "◉", title: "Hỗ trợ mỗi ngày", copy: "Từ 08:00 đến 21:00" },
];

function HomeProductSection({ id, eyebrow, title, copy, href, products, loading }) {
  return (
    <section className="home-v4-products" id={id}>
      <header className="home-v4-heading">
        <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{copy && <p>{copy}</p>}</div>
        <Link to={href}>Xem tất cả <span>→</span></Link>
      </header>
      {loading
        ? <ProductGridSkeleton count={4} />
        : <div className="product-grid">{products.slice(0, 4).map((product) => <ProductCard product={product} key={product.id} />)}</div>}
    </section>
  );
}

function HomeDiscovery({ content, loading }) {
  const newest = content.newest[0];
  const topRated = content.topRated[0];
  const sale = content.sale[0];
  const productHref = (product, fallback) => (
    product ? `/san-pham/${product.slug || product.id}` : fallback
  );

  return (
    <section className="home-v4-discovery" id="home-discovery">
      <header className="home-v4-heading">
        <div>
          <p className="eyebrow">NOVA CURATED</p>
          <h2>Bắt đầu từ điều bạn đang tìm.</h2>
          <p>Mỗi lối đi đều dẫn tới đúng bộ lọc, sản phẩm và dữ liệu đang có trên cửa hàng.</p>
        </div>
        <Link to="/cua-hang">Khám phá cửa hàng <span>→</span></Link>
      </header>

      <div className={`home-v4-discovery__grid ${loading ? "is-loading" : ""}`}>
        <Link className="home-v4-discovery__feature" to={productHref(newest, "/cua-hang?sort=newest")}>
          <SmartImage
            src={newest?.image || "/Images/nova-v3/home-story.png"}
            alt={newest?.name || "Bộ sưu tập mới của NOVAWEAR"}
          />
          <span className="home-v4-discovery__index">01 / NEW ARRIVAL</span>
          <div>
            <small>Cập nhật trực tiếp từ cửa hàng</small>
            <h3>{newest?.name || "Những thiết kế vừa lên kệ"}</h3>
            <b>Xem hàng mới →</b>
          </div>
        </Link>

        <div className="home-v4-discovery__rail">
          <Link to={productHref(topRated, "/cua-hang?sort=rating")}>
            <div>
              <span>02 / ĐƯỢC TIN CHỌN</span>
              <h3>{topRated?.name || "Sản phẩm được đánh giá cao"}</h3>
              <p>
                {topRated
                  ? `${topRated.rating} sao từ ${topRated.reviewCount} đánh giá đã xuất bản`
                  : "Khám phá lựa chọn từ đánh giá của khách đã nhận hàng"}
              </p>
            </div>
            <SmartImage
              src={topRated?.image || "/Images/nova-v3/product-tee-black.png"}
              alt={topRated?.name || "Sản phẩm được đánh giá cao"}
            />
          </Link>

          <Link to={productHref(sale, "/uu-dai")}>
            <div>
              <span>03 / NOVA OFFERS</span>
              <h3>{sale?.name || "Ưu đãi đang diễn ra"}</h3>
              <p>
                {sale?.comparePrice > sale?.price
                  ? `Tiết kiệm ${Math.round((1 - sale.price / sale.comparePrice) * 100)}% trên giá niêm yết`
                  : "Sản phẩm đang được Admin thiết lập ưu đãi"}
              </p>
            </div>
            <SmartImage
              src={sale?.image || "/Images/nova-v3/product-shirt-blue.png"}
              alt={sale?.name || "Sản phẩm ưu đãi"}
            />
          </Link>

          <Link className="home-v4-discovery__size" to="/chon-size">
            <div>
              <span>04 / SIZE CONCIERGE</span>
              <h3>Chọn đúng size ngay lần đầu.</h3>
              <p>Đối chiếu chiều cao, cân nặng và số đo trước khi đặt hàng.</p>
            </div>
            <strong>XS—3XL</strong>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [content, setContent] = useState({
    topRated: [],
    newest: [],
    men: [],
    unisex: [],
    women: [],
    sale: [],
    catalog: [],
    categories: [],
    news: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useShop();

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [topRated, newest, popular, sale, categories, news] = await Promise.all([
        api.get("/products?sort=rating&limit=100"),
        api.get("/products?sort=newest&limit=4"),
        api.get("/products?sort=popular&limit=100"),
        api.get("/products?sale=true&sort=popular&limit=4"),
        api.get("/categories"),
        api.get("/news"),
      ]);
      const popularProducts = (popular.data || []).filter((product) => Number(product.sold) > 0);
      setContent({
        topRated: (topRated.data || []).filter((product) => Number(product.reviewCount) > 0 && Number(product.rating) > 0),
        newest: newest.data || [],
        men: popularProducts.filter((product) => product.audience === "men"),
        unisex: popularProducts.filter((product) => product.audience === "unisex"),
        women: popularProducts.filter((product) => product.audience === "women"),
        sale: sale.data || [],
        catalog: popular.data || [],
        categories: categories.data || [],
        news: news.data || [],
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);

  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!targetId || loading) return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [loading, content.news.length]);

  const subscribe = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await api.post("/newsletter", { email });
      notify(result.message);
      setEmail("");
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const categoryIndex = useMemo(() => {
    const bySlug = new Map();
    content.categories.forEach((category) => {
      if (!category?.slug) return;
      const current = bySlug.get(category.slug);
      if (!current || Number(category.productCount || 0) > Number(current.productCount || 0)) {
        bySlug.set(category.slug, category);
      }
    });
    return bySlug;
  }, [content.categories]);

  const featuredCategories = useMemo(() => {
    const available = [...categoryIndex.values()].filter((category) => Number(category.productCount || 0) > 0);
    const priority = categoryPriority.map((slug) => categoryIndex.get(slug)).filter((category) => Number(category?.productCount || 0) > 0);
    const remaining = available
      .filter((category) => !categoryPriority.includes(category.slug))
      .sort((left, right) => Number(right.productCount || 0) - Number(left.productCount || 0));
    return [...priority, ...remaining].slice(0, 5).map((category) => {
      const matchingProduct = content.catalog.find((product) => product.category?.slug === category.slug && product.image);
      return {
        ...category,
        image: matchingProduct?.image
          || categoryFallbackImages[category.slug]
          || (category.audience === "women"
            ? "/Images/nova-v3/home-category-women-color.png"
            : "/Images/nova-v3/home-category-men-color.png"),
      };
    });
  }, [categoryIndex, content.catalog]);

  const totalProducts = useMemo(
    () => [...categoryIndex.values()].reduce((sum, category) => sum + Number(category.productCount || 0), 0),
    [categoryIndex],
  );
  const menCategories = [...categoryIndex.values()].filter((category) => category.audience === "men").length;
  const womenCategories = [...categoryIndex.values()].filter((category) => category.audience === "women").length;

  return (
    <main className="home-v4">
      <section className="home-v4-hero" id="home-top">
        <div className="home-v4-hero__media">
          <SmartImage src="/Images/nova-v3/home-hero.png" alt="Bộ sưu tập NOVAWEAR dành cho nhịp sống hiện đại" loading="eager" />
          <div className="home-v4-hero__stamp"><span>NEW SEASON</span><strong>26</strong></div>
          <p>NOVA ESSENTIALS / HO CHI MINH CITY</p>
        </div>
        <div className="home-v4-hero__copy">
          <p className="eyebrow">BỘ SƯU TẬP MỚI · 2026</p>
          <h1>Mặc đẹp theo <em>nhịp của bạn.</em></h1>
          <p>Những thiết kế tối giản, linh hoạt và dễ chịu — sẵn sàng đi cùng bạn từ ngày làm việc đến khoảng thời gian dành riêng cho mình.</p>
          <div>
            <Link className="button button--dark" to="/cua-hang">Khám phá bộ sưu tập <span>→</span></Link>
            <Link to="/ve-chung-toi">Câu chuyện NOVA <span>↗</span></Link>
          </div>
          <dl>
            <div><dt>{totalProducts || "350"}+</dt><dd>thiết kế đang bán</dd></div>
            <div><dt>{menCategories || "14"}</dt><dd>danh mục nam</dd></div>
            <div><dt>{womenCategories || "16"}</dt><dd>danh mục nữ</dd></div>
          </dl>
        </div>
      </section>

      <nav
        className="home-v4-categories"
        id="home-categories"
        aria-label="Danh mục đang có sản phẩm"
        style={{ "--home-category-count": featuredCategories.length + 1 }}
      >
        <div><span>SHOP BY CATEGORY</span><p>Đi thẳng đến món bạn cần.</p></div>
        {featuredCategories.map((category) => (
          <Link to={`/cua-hang?category=${category.slug}`} key={category.slug}>
            <SmartImage src={category.image} alt={category.name} />
            <span><strong>{category.name}</strong><small>{category.productCount} sản phẩm</small></span>
          </Link>
        ))}
        <Link className="home-v4-categories__all" to="/cua-hang"><i>＋</i><span><strong>Tất cả</strong><small>Khám phá</small></span></Link>
      </nav>

      {error && <div className="home-v4-error"><ErrorState message={error} onRetry={loadContent} /></div>}

      <HomeDiscovery content={content} loading={loading} />

      <section className="home-v4-occasions" id="home-occasions">
        <header className="home-v4-heading">
          <div><p className="eyebrow">CHỌN THEO NHỊP SỐNG</p><h2>Hôm nay bạn mặc gì?</h2><p>Ba gợi ý bắt đầu nhanh cho những lịch trình quen thuộc.</p></div>
        </header>
        <div className="home-v4-occasion-grid">
          <Link to="/phong-cach/thuong-ngay">
            <SmartImage src="/Images/nova-v3/home-story.png" alt="Trang phục mặc hằng ngày" />
            <span>01 / EVERYDAY</span><div><h3>Nhẹ nhàng mỗi ngày</h3><p>Phom thoải mái, màu dễ phối và chất liệu dễ chăm sóc.</p><b>Khám phá →</b></div>
          </Link>
          <Link to="/phong-cach/van-dong">
            <SmartImage src="/Images/nova-v3/lifestyle-motion-hero.png" alt="Trang phục vận động" />
            <span>02 / MOTION</span><div><h3>Sẵn sàng chuyển động</h3><p>Nhẹ, co giãn và thoát ẩm cho lịch tập lẫn ngày bận rộn.</p><b>Khám phá →</b></div>
          </Link>
          <Link to="/phong-cach/cuoi-tuan">
            <SmartImage src="/Images/nova-v3/about-team.png" alt="Trang phục cho cuối tuần" />
            <span>03 / WEEKEND</span><div><h3>Chậm lại cuối tuần</h3><p>Những lớp đồ mềm, tự nhiên và đủ đẹp để bước ra phố.</p><b>Khám phá →</b></div>
          </Link>
        </div>
      </section>

      {(loading || content.topRated.length > 0) && (
        <HomeProductSection
          id="home-top-rated"
          eyebrow="ĐÁNH GIÁ TỪ KHÁCH ĐÃ NHẬN HÀNG"
          title="Được đánh giá cao"
          copy="Chỉ hiển thị sản phẩm có đánh giá đã xuất bản từ khách hàng đủ điều kiện."
          href="/cua-hang?sort=rating"
          products={content.topRated}
          loading={loading}
        />
      )}

      <section className="home-v4-gender" id="home-gender">
        <Link to="/cua-hang?audience=men">
          <SmartImage src="/Images/nova-v3/home-category-men-color.png" alt="Thời trang nam NOVAWEAR" />
          <div><span>MEN / 2026</span><h2>Đồ nam</h2><p>Từ áo thun, sơ mi đến denim và đồ vận động.</p><b>Xem tất cả sản phẩm nam →</b></div>
        </Link>
        <Link to="/cua-hang?audience=women">
          <SmartImage src="/Images/nova-v3/home-category-women-color.png" alt="Thời trang nữ NOVAWEAR" />
          <div><span>WOMEN / 2026</span><h2>Đồ nữ</h2><p>Phom mềm, lớp đồ linh hoạt và những thiết kế cho chuyển động.</p><b>Xem tất cả sản phẩm nữ →</b></div>
        </Link>
      </section>

      {(content.men.length > 0 || content.unisex.length > 0 || content.women.length > 0) && (
        <section className="home-v4-dual-products" id="home-popular">
          {content.men.length > 0 && (
            <div>
              <header><span>NAM / MUA NHIỀU NHẤT</span><Link to="/cua-hang?audience=men&sort=popular">Xem đồ nam ↗</Link></header>
              <div>{content.men.slice(0, 4).map((product) => <div className="home-v4-popular-item" key={product.id}><ProductCard product={product} compact /><p>Đã bán {product.sold} sản phẩm</p></div>)}</div>
            </div>
          )}
          {content.unisex.length > 0 && (
            <div>
              <header><span>UNISEX / MUA NHIỀU NHẤT</span><Link to="/cua-hang?sort=popular">Xem sản phẩm ↗</Link></header>
              <div>{content.unisex.slice(0, 4).map((product) => <div className="home-v4-popular-item" key={product.id}><ProductCard product={product} compact /><p>Đã bán {product.sold} sản phẩm</p></div>)}</div>
            </div>
          )}
          {content.women.length > 0 && (
            <div>
              <header><span>NỮ / MUA NHIỀU NHẤT</span><Link to="/cua-hang?audience=women&sort=popular">Xem đồ nữ ↗</Link></header>
              <div>{content.women.slice(0, 4).map((product) => <div className="home-v4-popular-item" key={product.id}><ProductCard product={product} compact /><p>Đã bán {product.sold} sản phẩm</p></div>)}</div>
            </div>
          )}
        </section>
      )}

      <section className="home-v4-story" id="home-story">
        <div className="home-v4-story__media">
          <SmartImage src="/Images/nova-v3/about-studio.png" alt="Quá trình phát triển sản phẩm tại NOVA Studio" />
          <span>INSIDE NOVA STUDIO</span>
        </div>
        <div className="home-v4-story__copy">
          <p className="eyebrow">THIẾT KẾ CÓ LÝ DO</p>
          <h2>Ít hơn.<br /><em>Đúng hơn.</em><br />Dùng lâu hơn.</h2>
          <p>NOVA dành nhiều thời gian cho những phần bạn thực sự cảm nhận khi mặc: bề mặt chất liệu, khoảng rộng của phom và cách sản phẩm giữ dáng sau nhiều lần sử dụng.</p>
          <ol>
            <li><span>01</span><div><strong>Chạm dễ chịu</strong><small>Chất liệu được xem xét theo khí hậu và nhịp sống tại Việt Nam.</small></div></li>
            <li><span>02</span><div><strong>Chuyển động tự nhiên</strong><small>Phom được thử trong những tư thế và lịch trình hằng ngày.</small></div></li>
            <li><span>03</span><div><strong>Chăm sóc đơn giản</strong><small>Hướng dẫn rõ ràng để mỗi món giữ được chất lượng lâu hơn.</small></div></li>
          </ol>
          <Link to="/ve-chung-toi">Đọc câu chuyện của NOVA <span>→</span></Link>
        </div>
      </section>

      <HomeProductSection
        id="home-newest"
        eyebrow="FRESH DROP"
        title="Vừa lên kệ"
        copy="Những sản phẩm mới nhất do Admin cập nhật."
        href="/cua-hang?sort=newest"
        products={content.newest}
        loading={loading}
      />

      <section className="home-v4-promotion" id="home-offers">
        <div className="home-v4-promotion__copy">
          <p className="eyebrow">NOVA OFFERS</p>
          <h2>Giá tốt cho những món bạn sẽ mặc nhiều.</h2>
          <p>Sản phẩm và thời gian ưu đãi được cập nhật trực tiếp từ trang quản trị.</p>
          <Link className="button button--accent" to="/uu-dai">Xem toàn bộ ưu đãi <span>→</span></Link>
        </div>
        <div className="home-v4-promotion__products">
          {content.sale.slice(0, 2).map((product) => (
            <div key={product.id}>
              <ProductCard product={product} compact />
              <span>-{Math.round((1 - product.price / product.comparePrice) * 100)}%</span>
            </div>
          ))}
          {!loading && !content.sale.length && <p>Ưu đãi mới sẽ xuất hiện khi Admin thiết lập giá giảm.</p>}
        </div>
      </section>

      <section className="home-v4-lookbook" id="home-lookbook">
        <header className="home-v4-heading">
          <div><p className="eyebrow">NOVA IN REAL LIFE</p><h2>Mặc theo cách của bạn.</h2><p>Không có một công thức duy nhất cho phong cách tốt.</p></div>
          <Link to="/cua-hang">Tạo bộ đồ của bạn <span>→</span></Link>
        </header>
        <div>
          <figure><SmartImage src="/Images/homepage-irl1.png" alt="Phong cách NOVA đời thường 1" /><figcaption>MONDAY / 08:10</figcaption></figure>
          <figure><SmartImage src="/Images/homepage-irl3.png" alt="Phong cách NOVA đời thường 2" /><figcaption>FRIDAY / 18:30</figcaption></figure>
          <figure><SmartImage src="/Images/homepage-irl5.png" alt="Phong cách NOVA đời thường 3" /><figcaption>SUNDAY / 10:20</figcaption></figure>
        </div>
      </section>

      {content.news.length > 0 && (
        <section className="home-v4-journal" id="home-journal">
          <header className="home-v4-heading">
            <div><p className="eyebrow">NOVA JOURNAL</p><h2>Đọc để mặc tốt hơn.</h2><p>Góc nhìn về phom dáng, chất liệu và cách chăm sóc tủ đồ.</p></div>
            <Link to="/tin-tuc">Tất cả bài viết <span>→</span></Link>
          </header>
          <div>
            {content.news.slice(0, 3).map((article, index) => (
              <Link to={`/tin-tuc/${article.id}`} key={article.id}>
                <div><SmartImage src={article.image} alt={article.title} /><span>0{index + 1}</span></div>
                <p>{article.category} · {new Date(article.publishedAt).toLocaleDateString("vi-VN")}</p>
                <h3>{article.title}</h3>
                <b>Đọc bài →</b>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="home-v4-benefits" aria-label="Quyền lợi mua sắm">
        {benefits.map((item) => <article key={item.title}><span>{item.mark}</span><div><strong>{item.title}</strong><small>{item.copy}</small></div></article>)}
      </section>

      <section className="home-v4-newsletter" id="home-newsletter">
        <div><p className="eyebrow">NOVA LETTER</p><h2>Chuyện mới, sản phẩm mới và ưu đãi đáng chờ.</h2><p>Một email ngắn khi NOVA có điều thực sự hữu ích để chia sẻ.</p></div>
        <form onSubmit={subscribe}>
          <label htmlFor="home-newsletter-email">Email của bạn</label>
          <div><input id="home-newsletter-email" type="email" required placeholder="ban@email.com" value={email} onChange={(event) => setEmail(event.target.value)} /><button type="submit" disabled={submitting}>{submitting ? "Đang gửi..." : "Đăng ký →"}</button></div>
          <small>Không gửi thư rác. Bạn có thể hủy đăng ký bất cứ lúc nào.</small>
        </form>
      </section>
    </main>
  );
}
