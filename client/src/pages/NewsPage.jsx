import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { SmartImage } from "../components/Common";

function formatDate(value) {
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/news")
      .then((result) => setArticles(result.data))
      .catch((requestError) => setError(requestError.message));
  }, []);

  const categories = useMemo(
    () => ["Tất cả", ...new Set(articles.map((article) => article.category).filter(Boolean))],
    [articles],
  );
  const visibleArticles = activeCategory === "Tất cả"
    ? articles
    : articles.filter((article) => article.category === activeCategory);
  const featured = visibleArticles[0];
  const remaining = visibleArticles.slice(1);

  const subscribe = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      const result = await api.post("/newsletter", { email });
      setMessage(result.message);
      setEmail("");
    } catch (requestError) {
      setMessage(requestError.message);
    }
  };

  return (
    <div className="journal-page">
      <section className="journal-hero">
        <div className="journal-hero__copy">
          <p className="eyebrow">NOVA JOURNAL / 2026</p>
          <h1>Mặc đẹp bắt đầu từ việc <em>hiểu điều mình mặc.</em></h1>
          <p>Nơi NOVA chia sẻ góc nhìn thực tế về chất liệu, phom dáng, cách phối và cách chăm sóc những món đồ đồng hành mỗi ngày.</p>
          <div>
            <a href="#bai-viet-moi">Đọc bài mới nhất <span>↓</span></a>
            <span>Cập nhật mỗi tuần</span>
          </div>
        </div>
        <div className="journal-hero__visual">
          <SmartImage src={featured?.image || "/Images/nova-v3/home-story.png"} alt="NOVA Journal" loading="eager" />
          <span>STYLE · MATERIAL · CARE</span>
        </div>
      </section>

      <section className="journal-intro">
        <p>THE EDIT</p>
        <h2>Không nói về xu hướng chóng qua. Chúng tôi viết về những lựa chọn giúp tủ đồ dễ mặc và bền lâu hơn.</h2>
        <div><span>01</span>Phom dáng thực tế</div>
        <div><span>02</span>Chất liệu dễ hiểu</div>
        <div><span>03</span>Chăm đồ đúng cách</div>
      </section>

      <section className="journal-feed" id="bai-viet-moi">
        <header className="journal-section-head">
          <div><p className="eyebrow">Bài viết mới</p><h2>Chọn lọc từ NOVA</h2></div>
          <div className="journal-filters" aria-label="Lọc bài viết">
            {categories.map((category) => (
              <button
                type="button"
                className={activeCategory === category ? "is-active" : ""}
                onClick={() => setActiveCategory(category)}
                key={category}
              >
                {category}
              </button>
            ))}
          </div>
        </header>

        {error && <p className="journal-message">{error}</p>}
        {!error && featured && (
          <article className="journal-featured">
            <Link className="journal-featured__media" to={`/tin-tuc/${featured.id}`}><SmartImage src={featured.image} alt={featured.title} /></Link>
            <div className="journal-featured__copy">
              <span>{featured.category} · {formatDate(featured.publishedAt)}</span>
              <h2>{featured.title}</h2>
              <p>{featured.excerpt}</p>
              <div className="journal-reading"><i /><span>5 phút đọc</span></div>
              <Link to={`/tin-tuc/${featured.id}`}>Đọc toàn bộ bài viết <b>→</b></Link>
            </div>
          </article>
        )}

        {!error && remaining.length > 0 && (
          <div className="journal-grid">
            {remaining.map((article, index) => (
              <article className="journal-card" key={article.id}>
                <Link className="journal-card__media" to={`/tin-tuc/${article.id}`}>
                  <SmartImage src={article.image} alt={article.title} />
                  <span>{String(index + 2).padStart(2, "0")}</span>
                </Link>
                <div>
                  <p>{article.category} · {formatDate(article.publishedAt)}</p>
                  <h3>{article.title}</h3>
                  <span>{article.excerpt}</span>
                  <Link to={`/tin-tuc/${article.id}`}>Đọc tiếp <b>→</b></Link>
                </div>
              </article>
            ))}
          </div>
        )}
        {!error && !visibleArticles.length && <p className="journal-message">Chưa có bài viết trong chủ đề này.</p>}
      </section>

      <section className="journal-guides">
        <header><p className="eyebrow">NOVA FIELD NOTES</p><h2>Ba nơi hữu ích trước khi bạn chọn đồ.</h2></header>
        <div>
          <Link to="/chon-size"><span>01 / FIT</span><h3>Chọn đúng size</h3><p>Đo cơ thể, hiểu phom và tìm kích thước phù hợp trong vài bước.</p><b>Khám phá ↗</b></Link>
          <Link to="/cua-hang"><span>02 / EDIT</span><h3>Xây tủ đồ cơ bản</h3><p>Bắt đầu từ những món dễ mặc, dễ kết hợp và có thể dùng thường xuyên.</p><b>Mua sắm ↗</b></Link>
          <Link to="/ve-chung-toi"><span>03 / NOVA</span><h3>Cách chúng tôi làm đồ</h3><p>Từ lựa chọn vật liệu, điều chỉnh phom đến kiểm tra trước khi lên kệ.</p><b>Đọc câu chuyện ↗</b></Link>
        </div>
      </section>

      <section className="journal-newsletter">
        <div><p className="eyebrow">THE WEEKLY EDIT</p><h2>Một lá thư ngắn cho một tủ đồ tốt hơn.</h2></div>
        <form onSubmit={subscribe}>
          <label htmlFor="journal-email">Email của bạn</label>
          <div className="journal-newsletter__control">
            <input id="journal-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@email.com" />
            <button type="submit">Đăng ký <span>→</span></button>
          </div>
          <small>{message || "Không gửi thư rác. Bạn có thể hủy đăng ký bất cứ lúc nào."}</small>
        </form>
      </section>
    </div>
  );
}
