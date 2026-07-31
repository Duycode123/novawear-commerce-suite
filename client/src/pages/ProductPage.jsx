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
  const { addToCart, toggleWishlist, wishlist } = useShop();

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
  const availableStock = useMemo(() => {
    if (!product) return 0;
    if (!product.variants?.length) return Number(product.stock || 0);
    const variant = product.variants.find((item) => item.size === size && item.color === color);
    return Number(variant?.stock || 0);
  }, [product, size, color]);
  const reviewStats = useMemo(() => {
    const total = reviews.length;
    const average = total
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total
      : Number(product?.rating || 0);
    return {
      total,
      average,
      distribution: [5, 4, 3, 2, 1].map((rating) => {
        const count = reviews.filter((review) => Number(review.rating) === rating).length;
        return { rating, count, percent: total ? Math.round((count / total) * 100) : 0 };
      }),
    };
  }, [product?.rating, reviews]);

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

      <section className="product-editorial" aria-labelledby="product-description-title">
        <div className="product-editorial__masthead">
          <div className="product-editorial__chapter"><span>01</span><p>Hồ sơ sản phẩm</p></div>
          <header>
            <p className="eyebrow">MÔ TẢ SẢN PHẨM</p>
            <h2 id="product-description-title"><span>{product.name}</span>Được làm để mặc lâu hơn.</h2>
            <p>{product.longDescription || product.description || "Thông tin chi tiết đang được cập nhật cho sản phẩm này."}</p>
          </header>
        </div>

        <div className="product-editorial__visual-grid">
          <figure className="product-editorial__visual">
            <SmartImage src={images[1] || images[0]} alt={`${product.name} - hình ảnh chi tiết`} />
            <figcaption><span>01 / Góc nhìn chi tiết</span>Chi tiết thiết kế và bề mặt chất liệu của {product.name}.</figcaption>
          </figure>
          <aside className="product-editorial__facts">
            <div><span>Thông tin nhanh</span><strong>{product.sku}</strong></div>
            <h3>{product.description || "Thiết kế tối giản, chú trọng cảm giác mặc và độ bền."}</h3>
            <dl>
              <div><dt>Chất liệu</dt><dd>{product.materials || "Đang cập nhật"}</dd></div>
              <div><dt>Phom dáng</dt><dd>{product.fit || "Đang cập nhật"}</dd></div>
              <div><dt>Phù hợp</dt><dd>{product.suitableFor || "Mặc hằng ngày"}</dd></div>
              <div><dt>Xuất xứ</dt><dd>{product.origin || "Đang cập nhật"}</dd></div>
            </dl>
          </aside>
        </div>

        {product.highlights?.length > 0 && (
          <div className="product-editorial__highlights">
            {product.highlights.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong><i>↗</i></div>)}
          </div>
        )}

        <div className="product-editorial__content">
          <article className="product-editorial-card product-editorial-card--specs">
            <header><span>02 / Thông số</span><h3>Thông số sản phẩm</h3></header>
            <dl>
              <div><dt>Mã sản phẩm</dt><dd>{product.sku}</dd></div>
              <div><dt>Chất liệu</dt><dd>{product.materials || "Đang cập nhật"}</dd></div>
              <div><dt>Kiểu dáng</dt><dd>{product.fit || "Đang cập nhật"}</dd></div>
              <div><dt>Phù hợp</dt><dd>{product.suitableFor || "Mặc hằng ngày"}</dd></div>
              {product.modelInfo && <div><dt>Thông tin mẫu</dt><dd>{product.modelInfo}</dd></div>}
              <div><dt>Xuất xứ</dt><dd>{product.origin || "Đang cập nhật"}</dd></div>
            </dl>
          </article>

          {product.featureDetails?.length > 0 && (
            <article className="product-editorial-card product-editorial-card--features">
              <header><span>03 / Cấu trúc</span><h3>Chi tiết tạo nên khác biệt</h3></header>
              <div className="product-editorial__feature-list">
                {product.featureDetails.map((item, index) => (
                  <div key={`${item.title}-${index}`}><b>{String(index + 1).padStart(2, "0")}</b><div><h4>{item.title}</h4><p>{item.description}</p></div></div>
                ))}
              </div>
            </article>
          )}

          <article className="product-editorial-card product-editorial-card--care">
            <header><span>04 / Bảo quản</span><h3>Chăm đúng cách, mặc được lâu.</h3></header>
            <p>{product.care || "Vui lòng làm theo hướng dẫn trên nhãn sản phẩm thực tế."}</p>
            <p>Phân loại theo màu trước khi giặt. Luôn đối chiếu nhiệt độ và phương pháp làm sạch trên nhãn để duy trì bề mặt, màu sắc và phom dáng.</p>
          </article>

          <article className="product-editorial-card product-editorial-card--delivery">
            <header><span>05 / Dịch vụ</span><h3>Giao hàng & đổi trả</h3></header>
            <div><strong>2–5 ngày</strong><p>Thời gian giao hàng dự kiến tùy khu vực. Hành trình đơn hàng được cập nhật trong trang Tài khoản.</p></div>
            <div><strong>30 ngày</strong><p>Hỗ trợ đổi size nếu sản phẩm còn nguyên tem, chưa qua sử dụng và đáp ứng điều kiện đổi trả.</p></div>
          </article>
        </div>
      </section>

      <section className="reviews-editorial" id="reviews" aria-labelledby="reviews-title">
        <header className="reviews-editorial__header">
          <div><p className="eyebrow">ĐÁNH GIÁ ĐÃ XÁC MINH</p><h2 id="reviews-title">Cảm nhận thật,<br />từ người đã mặc.</h2></div>
          <div><strong>{reviewStats.total}</strong><p>đánh giá đã được xác minh từ khách hàng nhận hàng thành công.</p></div>
        </header>

        <div className="reviews-editorial__layout">
          <aside className="review-overview">
            <span>Điểm trung bình</span>
            <div className="review-overview__score"><strong>{reviewStats.total ? reviewStats.average.toFixed(1) : "—"}</strong><small>/ 5.0</small></div>
            <p className="review-overview__stars">{reviewStats.total ? `${"★".repeat(Math.round(reviewStats.average))}${"☆".repeat(5 - Math.round(reviewStats.average))}` : "☆☆☆☆☆"}</p>
            <p className="review-overview__count">Dựa trên {reviewStats.total} đánh giá</p>
            <div className="review-distribution">
              {reviewStats.distribution.map((item) => (
                <div key={item.rating}><span>{item.rating} sao</span><i><b style={{ width: `${item.percent}%` }} /></i><small>{item.count}</small></div>
              ))}
            </div>
            <p className="review-overview__verified"><span>✓</span>Chỉ khách đã nhận hàng mới có thể đánh giá.</p>
          </aside>

          <div className="review-feed">
            <header><div><span>Cảm nhận khách hàng</span><strong>{reviewStats.total} chia sẻ</strong></div><p>Mới nhất trước</p></header>
            <div className="review-feed__list">
              {reviews.length ? reviews.map((review) => (
                <article className="review-story" key={review.id}>
                  <header>
                    <div className="avatar">{review.name?.charAt(0)}</div>
                    <div><strong>{review.name}</strong><span>✓ Đã mua & nhận hàng</span></div>
                    <time>{new Date(review.createdAt).toLocaleDateString("vi-VN")}</time>
                  </header>
                  <div className="review-story__rating"><span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><b>{Number(review.rating).toFixed(1)}</b></div>
                  <blockquote>“{review.content}”</blockquote>
                  {review.images?.length > 0 && <div className="review-images">{review.images.map((image) => <SmartImage src={image} alt={`Ảnh đánh giá của ${review.name}`} key={image} />)}</div>}
                  <footer><span>Đánh giá ngày {new Date(review.createdAt).toLocaleDateString("vi-VN")}</span><span>{product.name}</span></footer>
                </article>
              )) : (
                <div className="review-empty"><span>N</span><h3>Chưa có đánh giá</h3><p>Người mua đầu tiên nhận hàng sẽ có thể chia sẻ cảm nhận tại đây.</p></div>
              )}
            </div>
          </div>
        </div>
        <p className="reviews-editorial__policy"><span>✓</span> Khu vực này chỉ hiển thị đánh giá đã xác minh. Khách hàng viết đánh giá từ chi tiết đơn hàng sau khi nhận hàng thành công.</p>
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
