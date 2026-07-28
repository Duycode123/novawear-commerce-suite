import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { ErrorState, ProductCard, ProductGridSkeleton, SectionHeading, SmartImage } from "../components/Common";
import { useShop } from "../context/ShopContext";

const categoryVisuals = [
  { slug: "ao-thun", image: "/Images/11-181_672x990.jpg", tone: "peach" },
  { slug: "ao-so-mi", image: "/Images/aBT5A8965_672x990.jpg", tone: "lime" },
  { slug: "quan-dai", image: "/Images/jeanv2garment_16_672x990.jpg", tone: "blue" },
  { slug: "quan-short", image: "/Images/navyshort_672x990.jpg", tone: "sand" },
];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useShop();

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productResult, categoryResult] = await Promise.all([
        api.get("/products?featured=true&limit=8"),
        api.get("/categories"),
      ]);
      setProducts(productResult.data);
      setCategories(categoryResult.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

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

  const visualCategories = categoryVisuals.map((visual) => ({
    ...visual,
    ...(categories.find((category) => category.slug === visual.slug) || {
      name: visual.slug === "ao-thun" ? "Áo thun" : visual.slug === "ao-so-mi" ? "Áo sơ mi" : visual.slug === "quan-dai" ? "Quần dài" : "Quần short",
      productCount: 0,
    }),
  }));

  return (
    <>
      <section className="home-hero">
        <div className="home-hero__copy">
          <p className="eyebrow">Bộ sưu tập 2026 · Everyday, reimagined</p>
          <h1>Thoải mái là một <em>tuyên ngôn.</em></h1>
          <p className="home-hero__lead">
            Những món đồ linh hoạt, nhẹ tênh và đủ khác biệt để bạn mặc theo cách của riêng mình.
          </p>
          <div className="home-hero__actions">
            <Link className="button button--dark" to="/cua-hang">Khám phá bộ sưu tập <span>→</span></Link>
            <Link className="text-link" to="/ve-chung-toi">Câu chuyện chất liệu <span>↗</span></Link>
          </div>
          <div className="home-hero__proof">
            <div><strong>4.9/5</strong><span>từ cộng đồng</span></div>
            <div><strong>30 ngày</strong><span>đổi size miễn phí</span></div>
            <div><strong>24h</strong><span>xử lý đơn nhanh</span></div>
          </div>
        </div>
        <div className="home-hero__visual">
          <div className="hero-stamp"><span>NOVA</span><b>DROP 01</b></div>
          <div className="hero-shape hero-shape--one" />
          <div className="hero-shape hero-shape--two" />
          <SmartImage src="/Images/about-us-model.webp" alt="Người mẫu mặc áo thun xanh navy" loading="eager" />
          <div className="hero-note">
            <span>01</span>
            <p>Chất vải mát<br />Phom đẹp tự nhiên</p>
          </div>
          <p className="hero-vertical">MADE FOR REAL LIFE</p>
        </div>
      </section>

      <section className="marquee-strip" aria-label="Giá trị của NOVAWEAR">
        <div>
          <span>Chất liệu có chọn lọc</span><b>✦</b>
          <span>Phom dáng linh hoạt</span><b>✦</b>
          <span>Thiết kế có trách nhiệm</span><b>✦</b>
          <span>Chất liệu có chọn lọc</span><b>✦</b>
          <span>Phom dáng linh hoạt</span><b>✦</b>
        </div>
      </section>

      <section className="section home-categories">
        <SectionHeading
          eyebrow="Mặc theo nhịp của bạn"
          title="Bắt đầu từ món đồ quen"
          copy="Tủ đồ gọn hơn, phối được nhiều hơn, thoải mái từ sáng đến tối."
          action={<Link className="text-link" to="/cua-hang">Xem tất cả <span>→</span></Link>}
        />
        <div className="category-grid">
          {visualCategories.map((category, index) => (
            <Link
              className={`category-tile category-tile--${category.tone}`}
              to={`/cua-hang?category=${category.slug}`}
              key={category.slug}
            >
              <div className="category-tile__number">0{index + 1}</div>
              <SmartImage src={category.image} alt={category.name} />
              <div className="category-tile__content">
                <p>{category.productCount || "Bộ sưu tập"} sản phẩm</p>
                <h3>{category.name}</h3>
                <span>Khám phá →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section section--cream home-featured">
        <SectionHeading
          eyebrow="Được yêu thích"
          title="Món hay được chọn"
          copy="Những thiết kế đã đi qua nhiều ngày làm việc, buổi hẹn và chuyến đi."
          action={<Link className="button button--outline button--small" to="/cua-hang?sort=popular">Xem bán chạy</Link>}
        />
        {loading && <ProductGridSkeleton count={4} />}
        {error && <ErrorState message={error} onRetry={loadContent} />}
        {!loading && !error && (
          <div className="product-grid">
            {products.slice(0, 4).map((product) => <ProductCard product={product} key={product.id} />)}
          </div>
        )}
      </section>

      <section className="editorial-block">
        <div className="editorial-block__image">
          <SmartImage src="/Images/DSC08342_672x990.jpg" alt="Thiết kế áo khoác nhẹ trong bộ sưu tập NOVA" />
          <div className="editorial-block__caption">NOVA JOURNAL · 01</div>
        </div>
        <div className="editorial-block__copy">
          <p className="eyebrow">Không chỉ là quần áo</p>
          <h2>Ít hơn, nhưng đúng với bạn hơn.</h2>
          <p>
            Chúng tôi bắt đầu mỗi thiết kế bằng một câu hỏi đơn giản: món đồ này có thực sự dễ sống cùng không?
            Từ bề mặt vải, đường may tới chiếc túi nhỏ đều phải có lý do.
          </p>
          <div className="editorial-block__list">
            <div><span>01</span><p><strong>Chạm dễ chịu</strong>Ưu tiên sợi mềm, thoáng và bền.</p></div>
            <div><span>02</span><p><strong>Mặc linh hoạt</strong>Phom cân bằng, phối nhanh mỗi sáng.</p></div>
            <div><span>03</span><p><strong>Dùng lâu hơn</strong>Thiết kế tiết chế để không chóng cũ.</p></div>
          </div>
          <Link className="button button--accent" to="/ve-chung-toi">Đọc câu chuyện NOVA <span>→</span></Link>
        </div>
      </section>

      {!loading && !error && products.length > 4 && (
        <section className="section home-more">
          <SectionHeading
            eyebrow="Fresh drop"
            title="Vừa lên kệ"
            action={<Link className="text-link" to="/cua-hang?sort=newest">Xem hàng mới <span>→</span></Link>}
          />
          <div className="product-grid product-grid--wide">
            {products.slice(4, 8).map((product) => <ProductCard product={product} key={product.id} />)}
          </div>
        </section>
      )}

      <section className="community-section">
        <div className="community-section__heading">
          <p className="eyebrow">#NOVAEVERYDAY</p>
          <h2>Mặc thật. Sống thật.</h2>
          <p>Chia sẻ cách bạn mặc NOVAWEAR và gặp nhau trong cùng một nhịp.</p>
        </div>
        <div className="community-grid">
          {["homepage-irl1.png", "homepage-irl2.png", "homepage-irl3.png", "homepage-irl4.png", "homepage-irl5.png"].map((image, index) => (
            <div className={`community-card community-card--${index + 1}`} key={image}>
              <SmartImage src={`/Images/${image}`} alt={`Phong cách NOVAWEAR ${index + 1}`} />
              <span>@nova.friend{index + 1}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="newsletter">
        <div>
          <p className="eyebrow">NOVA LETTER</p>
          <h2>Nhận điều mới,<br />không nhận thư rác.</h2>
        </div>
        <form onSubmit={subscribe}>
          <label htmlFor="newsletter-email">Email của bạn</label>
          <div>
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="ban@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" disabled={submitting}>{submitting ? "Đang gửi..." : "Đăng ký →"}</button>
          </div>
          <p>Ưu đãi đầu tiên 10% và những câu chuyện chỉ gửi cho người đăng ký.</p>
        </form>
      </section>
    </>
  );
}
