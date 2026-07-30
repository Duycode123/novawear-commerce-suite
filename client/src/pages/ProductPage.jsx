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
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: "", images: [] });
  const [uploadingReviewImage, setUploadingReviewImage] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const { addToCart, toggleWishlist, wishlist, user, notify, integrations } = useShop();

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

  useEffect(() => {
    if (!user || !product) {
      setReviewEligibility(null);
      return;
    }
    api.get(`/products/${product.id}/review-eligibility`)
      .then((result) => setReviewEligibility(result.data))
      .catch(() => setReviewEligibility({ eligible: false, delivered: false }));
  }, [product, user]);

  const discountPercent = useMemo(() => {
    if (!product?.comparePrice || product.comparePrice <= product.price) return 0;
    return Math.round((1 - product.price / product.comparePrice) * 100);
  }, [product]);
  const availableStock = useMemo(() => {
    if (!product) return 0;
    if (!product.variants?.length) return Number(product.stock || 0);
    const variant = product.variants.find((item) => item.size === size && item.color === color);
    return Number(variant?.stock || 0);
  }, [product, size, color]);

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
    if (!reviewEligibility?.eligible) {
      notify("Đánh giá chỉ mở sau khi đơn hàng đã giao thành công.", "info");
      return;
    }
    setSubmittingReview(true);
    try {
      const result = await api.post(`/products/${product.id}/reviews`, reviewForm);
      setReviews((current) => [result.data, ...current]);
      setReviewForm({ rating: 5, content: "", images: [] });
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const uploadReviewImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file || reviewForm.images.length >= 3) return;
    setUploadingReviewImage(true);
    try {
      const result = await api.upload("/uploads/review", file);
      setReviewForm((current) => ({ ...current, images: [...current.images, result.data.url] }));
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setUploadingReviewImage(false);
      event.target.value = "";
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
              <button type="button" aria-label="Tăng số lượng" onClick={() => setQuantity((value) => Math.min(availableStock, value + 1))}>＋</button>
            </div>
            <button
              className="button button--dark button--grow"
              type="button"
              disabled={!availableStock || !size || !color}
              onClick={() => addToCart({ ...product, stock: availableStock }, { size, color, quantity })}
            >
              {availableStock ? "Thêm vào giỏ" : "Tạm hết hàng"} <span>→</span>
            </button>
          </div>
          <p className={`stock-note ${availableStock <= 20 ? "stock-note--low" : ""}`}>
            <span>{availableStock > 0 ? "●" : "○"}</span>
            {availableStock > 0 ? `Còn ${availableStock} sản phẩm cho lựa chọn này` : "Hết hàng với size/màu đã chọn"}
          </p>

          <div className="product-perks">
            <div><span>↺</span><p><strong>Đổi size trong 30 ngày</strong>Miễn phí cho lần đổi đầu tiên.</p></div>
            <div><span>⌁</span><p><strong>Giao hàng toàn quốc</strong>Miễn phí cho đơn từ 699K.</p></div>
            <div><span>✓</span><p><strong>Kiểm tra trước khi nhận</strong>An tâm với mọi đơn hàng.</p></div>
          </div>

        </div>
      </section>

      <section className="product-content-below">
        <header><p className="eyebrow">MÔ TẢ SẢN PHẨM</p><h2>Thiết kế dành cho cách bạn chuyển động.</h2><p>{product.longDescription || product.description || "Thông tin chi tiết đang được cập nhật cho sản phẩm này."}</p></header>
        {images[1] && <figure className="product-content-visual"><SmartImage src={images[1]} alt={`${product.name} - hình ảnh chi tiết`} /><figcaption>Chi tiết thiết kế và bề mặt chất liệu của {product.name}.</figcaption></figure>}
        {product.highlights?.length > 0 && <div className="product-feature-tags">{product.highlights.map((item, index) => <div key={item}><span>0{index + 1}</span><strong>{item}</strong></div>)}</div>}
        <article><span>01</span><div><h3>Thông số sản phẩm</h3><dl><div><dt>Mã sản phẩm</dt><dd>{product.sku}</dd></div><div><dt>Chất liệu</dt><dd>{product.materials || "Đang cập nhật"}</dd></div><div><dt>Kiểu dáng</dt><dd>{product.fit || "Đang cập nhật"}</dd></div><div><dt>Phù hợp</dt><dd>{product.suitableFor || "Mặc hằng ngày"}</dd></div>{product.modelInfo && <div><dt>Người mẫu</dt><dd>{product.modelInfo}</dd></div>}<div><dt>Xuất xứ</dt><dd>{product.origin || "Đang cập nhật"}</dd></div></dl></div></article>
        {product.featureDetails?.length > 0 && <article className="product-feature-article"><span>02</span><div><h3>Điểm nổi bật trong thiết kế</h3><div className="product-feature-details">{product.featureDetails.map((item, index) => <section key={`${item.title}-${index}`}><b>{String(index + 1).padStart(2, "0")}</b><h4>{item.title}</h4><p>{item.description}</p></section>)}</div></div></article>}
        <article><span>{product.featureDetails?.length ? "03" : "02"}</span><div><h3>Hướng dẫn bảo quản</h3><p>{product.care || "Vui lòng làm theo hướng dẫn trên nhãn sản phẩm thực tế."}</p><p>Phân loại sản phẩm theo màu sắc trước khi giặt. Kiểm tra nhiệt độ và phương pháp làm sạch trên nhãn để duy trì bề mặt, màu sắc và phom dáng.</p></div></article>
        <article><span>{product.featureDetails?.length ? "04" : "03"}</span><div><h3>Giao hàng & đổi trả</h3><p>Thời gian giao hàng dự kiến từ 2–5 ngày tùy khu vực. Toàn bộ hành trình đơn hàng được cập nhật trong trang Tài khoản.</p><p>Hỗ trợ đổi size trong 30 ngày nếu sản phẩm còn nguyên tem, chưa qua sử dụng và đáp ứng điều kiện đổi trả của NOVAWEAR.</p></div></article>
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
                {review.images?.length > 0 && <div className="review-images">{review.images.map((image) => <SmartImage src={image} alt="Ảnh đánh giá" key={image} />)}</div>}
              </article>
            )) : <p className="muted">Chưa có đánh giá. Hãy là người đầu tiên chia sẻ cảm nhận.</p>}
          </div>
          <form className="review-form" onSubmit={submitReview}>
            <h3>Viết đánh giá</h3>
            <p>{!user
              ? "Bạn cần đăng nhập trước khi gửi."
              : reviewEligibility?.eligible
                ? `Chia sẻ với tên ${user.name}`
                : reviewEligibility?.reviewed
                  ? "Bạn đã gửi đánh giá cho sản phẩm này."
                  : "Nút đánh giá sẽ mở khi đơn có sản phẩm này được giao thành công."}</p>
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
              <span>Ảnh thực tế (tối đa 3)</span>
              {integrations.uploads && <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={uploadReviewImage} disabled={uploadingReviewImage || reviewForm.images.length >= 3 || !reviewEligibility?.eligible} />}
              {reviewForm.images.length > 0 && <div className="review-images">{reviewForm.images.map((image) => <SmartImage src={image} alt="Ảnh chờ gửi" key={image} />)}</div>}
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
            <button className="button button--dark" type="submit" disabled={submittingReview || !user || !reviewEligibility?.eligible}>
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
