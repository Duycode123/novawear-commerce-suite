import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import { formatMoney } from "../config/site";
import { useShop } from "../context/ShopContext";
import { ErrorState, ProductCard, ProductGridSkeleton, SectionHeading, SmartImage } from "../components/Common";

export default function ProductPage() {
  const { identifier } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const { addToCart, toggleWishlist, wishlist, user, notify } = useShop();

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.get(`/products/${identifier}`);
      setProduct(result.data);
      setRelated(result.related || []);
      setReviews(result.reviews || []);
      setActiveImage(result.data.images?.[0] || result.data.image);
      setSize(result.data.sizes?.[0] || "");
      setColor(result.data.colors?.[0] || "");
      setQuantity(1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [identifier]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const discountPercent = useMemo(() => {
    if (!product?.comparePrice || product.comparePrice <= product.price) return 0;
    return Math.round((1 - product.price / product.comparePrice) * 100);
  }, [product]);

  if (loading) {
    return (
      <div className="product-page section">
        <div className="product-detail-skeleton">
          <div className="skeleton skeleton--detail-image" />
          <div><div className="skeleton skeleton--line" /><div className="skeleton skeleton--line" /><div className="skeleton skeleton--panel" /></div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return <div className="section"><ErrorState message={error || "Sản phẩm không tồn tại."} onRetry={loadProduct} /></div>;
  }

  const wished = wishlist.some((item) => item.id === product.id);
  const images = product.images?.length ? product.images : [product.image];

  const submitReview = async (event) => {
    event.preventDefault();
    if (!user) {
      notify("Hãy đăng nhập để gửi đánh giá.", "info");
      return;
    }
    setSubmittingReview(true);
    try {
      const result = await api.post(`/products/${product.id}/reviews`, reviewForm);
      setReviews((current) => [result.data, ...current]);
      setReviewForm({ rating: 5, content: "" });
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="product-page">
      <nav className="breadcrumbs" aria-label="Đường dẫn">
        <Link to="/">Trang chủ</Link><span>/</span>
        <Link to="/cua-hang">Cửa hàng</Link><span>/</span>
        <Link to={`/cua-hang?category=${product.category?.slug}`}>{product.category?.name}</Link><span>/</span>
        <span>{product.name}</span>
      </nav>

      <section className="product-detail">
        <div className="product-gallery">
          <div className="product-gallery__thumbs">
            {images.map((image, index) => (
              <button
                className={activeImage === image ? "is-active" : ""}
                type="button"
                onClick={() => setActiveImage(image)}
                aria-label={`Xem ảnh ${index + 1}`}
                key={`${image}-${index}`}
              >
                <SmartImage src={image} alt="" />
              </button>
            ))}
          </div>
          <div className="product-gallery__main">
            <SmartImage src={activeImage} alt={product.name} loading="eager" />
            {product.badge && <span className="product-gallery__badge">{product.badge}</span>}
          </div>
        </div>

        <div className="product-info">
          <div className="product-info__top">
            <p className="product-info__category">{product.category?.name} · {product.sku}</p>
            <button type="button" className={wished ? "is-wished" : ""} onClick={() => toggleWishlist(product)}>
              {wished ? "♥ Đã lưu" : "♡ Lưu lại"}
            </button>
          </div>
          <h1>{product.name}</h1>
          <div className="product-info__rating">
            <span>★ {product.rating || "Mới"}</span>
            <a href="#reviews">{product.reviewCount || reviews.length} đánh giá</a>
            <span>{product.sold} lượt mua</span>
          </div>
          <div className="product-info__price">
            <strong>{formatMoney(product.price)}</strong>
            {product.comparePrice > product.price && <del>{formatMoney(product.comparePrice)}</del>}
            {discountPercent > 0 && <span>-{discountPercent}%</span>}
          </div>
          <p className="product-info__description">{product.description}</p>

          <fieldset className="option-field">
            <legend>Màu sắc <strong>{color}</strong></legend>
            <div className="option-pills option-pills--color">
              {product.colors?.map((item, index) => (
                <button
                  type="button"
                  className={color === item ? "is-active" : ""}
                  onClick={() => setColor(item)}
                  key={item}
                >
                  <i style={{ "--swatch-index": index }} />
                  {item}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="option-field">
            <legend>
              Kích thước <strong>{size}</strong>
              <Link to="/chon-size">Hướng dẫn chọn size ↗</Link>
            </legend>
            <div className="option-pills option-pills--size">
              {product.sizes?.map((item) => (
                <button
                  type="button"
                  className={size === item ? "is-active" : ""}
                  onClick={() => setSize(item)}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="product-buy">
            <div className="quantity-picker" aria-label="Số lượng">
              <button type="button" aria-label="Giảm số lượng" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
              <span>{quantity}</span>
              <button type="button" aria-label="Tăng số lượng" onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}>＋</button>
            </div>
            <button
              className="button button--dark button--grow"
              type="button"
              disabled={!product.stock || !size || !color}
              onClick={() => addToCart(product, { size, color, quantity })}
            >
              {product.stock ? "Thêm vào giỏ" : "Tạm hết hàng"} <span>→</span>
            </button>
          </div>
          <p className={`stock-note ${product.stock <= 20 ? "stock-note--low" : ""}`}>
            <span>{product.stock > 0 ? "●" : "○"}</span>
            {product.stock > 20 ? "Còn hàng, sẵn sàng giao" : product.stock > 0 ? `Chỉ còn ${product.stock} sản phẩm` : "Đang chờ bổ sung"}
          </p>

          <div className="product-perks">
            <div><span>↺</span><p><strong>Đổi size trong 30 ngày</strong>Miễn phí cho lần đổi đầu tiên.</p></div>
            <div><span>⌁</span><p><strong>Giao hàng toàn quốc</strong>Miễn phí cho đơn từ 699K.</p></div>
            <div><span>✓</span><p><strong>Kiểm tra trước khi nhận</strong>An tâm với mọi đơn hàng.</p></div>
          </div>

          <div className="product-accordions">
            <details open>
              <summary>Chất liệu & cảm giác <span>＋</span></summary>
              <p>{product.materials}</p>
            </details>
            <details>
              <summary>Hướng dẫn bảo quản <span>＋</span></summary>
              <p>{product.care}</p>
            </details>
            <details>
              <summary>Giao hàng & đổi trả <span>＋</span></summary>
              <p>Giao dự kiến 2–5 ngày. Đổi size miễn phí trong 30 ngày nếu sản phẩm còn nguyên tem và chưa qua sử dụng.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="product-story">
        <div>
          <p className="eyebrow">Designed for daily motion</p>
          <h2>Một món đồ tốt là món bạn không cần nghĩ nhiều khi mặc.</h2>
        </div>
        <div className="product-story__facts">
          <div><strong>01</strong><p>Phom được thử trên nhiều dáng người Việt.</p></div>
          <div><strong>02</strong><p>Chất liệu ưu tiên bề mặt mềm và độ thoáng.</p></div>
          <div><strong>03</strong><p>Đường may gia cố tại các vị trí vận động nhiều.</p></div>
        </div>
      </section>

      <section className="section reviews-section" id="reviews">
        <SectionHeading
          eyebrow="Người thật, cảm nhận thật"
          title={`Đánh giá sản phẩm (${reviews.length})`}
          copy="Mỗi chia sẻ giúp cộng đồng chọn đúng hơn."
        />
        <div className="reviews-layout">
          <div className="review-summary">
            <strong>{product.rating || "—"}</strong>
            <div><span>★★★★★</span><p>Dựa trên {product.reviewCount || reviews.length} đánh giá</p></div>
          </div>
          <div className="review-list">
            {reviews.length ? reviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="review-card__head">
                  <div className="avatar">{review.name?.charAt(0)}</div>
                  <div><strong>{review.name}</strong><span>Đã mua hàng</span></div>
                  <time>{new Date(review.createdAt).toLocaleDateString("vi-VN")}</time>
                </div>
                <p className="review-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                <p>{review.content}</p>
              </article>
            )) : <p className="muted">Chưa có đánh giá. Hãy là người đầu tiên chia sẻ cảm nhận.</p>}
          </div>
          <form className="review-form" onSubmit={submitReview}>
            <h3>Viết đánh giá</h3>
            <p>{user ? `Chia sẻ với tên ${user.name}` : "Bạn cần đăng nhập trước khi gửi."}</p>
            <label>
              <span>Điểm của bạn</span>
              <select value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))}>
                <option value={5}>5 — Rất hài lòng</option>
                <option value={4}>4 — Hài lòng</option>
                <option value={3}>3 — Bình thường</option>
                <option value={2}>2 — Chưa tốt</option>
                <option value={1}>1 — Không hài lòng</option>
              </select>
            </label>
            <label>
              <span>Cảm nhận</span>
              <textarea
                required
                minLength={10}
                maxLength={500}
                rows={4}
                value={reviewForm.content}
                placeholder="Phom dáng, chất liệu, kích thước..."
                onChange={(event) => setReviewForm((current) => ({ ...current, content: event.target.value }))}
              />
            </label>
            <button className="button button--dark" type="submit" disabled={submittingReview || !user}>
              {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </form>
        </div>
      </section>

      <section className="section section--cream related-products">
        <SectionHeading eyebrow="Có thể bạn cũng thích" title="Mặc cùng nhau" />
        {related.length ? (
          <div className="product-grid">
            {related.map((item) => <ProductCard product={item} key={item.id} />)}
          </div>
        ) : <ProductGridSkeleton count={4} />}
      </section>
    </div>
  );
}
