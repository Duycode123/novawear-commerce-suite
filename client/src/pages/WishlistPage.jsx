import React from "react";
import { Link } from "react-router-dom";
import { EmptyState, ProductCard } from "../components/Common";
import { useShop } from "../context/ShopContext";

export default function WishlistPage() {
  const { wishlist } = useShop();

  if (!wishlist.length) {
    return (
      <div className="wishlist-empty-page">
        <EmptyState
          symbol="♡"
          title="Danh sách yêu thích đang trống"
          copy="Lưu lại những thiết kế bạn quan tâm để dễ dàng so sánh và quay lại mua khi sẵn sàng."
          action={<Link className="button button--dark" to="/cua-hang">Khám phá sản phẩm <span>→</span></Link>}
        />
        <div className="wishlist-empty-page__benefits">
          <div><span>01</span><p><strong>Lưu nhanh</strong> bằng biểu tượng trái tim trên mỗi sản phẩm.</p></div>
          <div><span>02</span><p><strong>Không bỏ lỡ</strong> những lựa chọn phù hợp với phong cách của bạn.</p></div>
          <div><span>03</span><p><strong>Mua thuận tiện</strong> khi đã sẵn sàng hoàn thiện tủ đồ.</p></div>
        </div>
      </div>
    );
  }

  return (
    <main className="wishlist-page">
      <header className="wishlist-hero">
        <div>
          <p className="eyebrow">NOVA SAVED EDIT</p>
          <h1>Những lựa chọn<br />dành riêng cho bạn.</h1>
        </div>
        <div className="wishlist-hero__aside">
          <strong>{String(wishlist.length).padStart(2, "0")}</strong>
          <p>Sản phẩm đang được lưu. Danh sách này được giữ trên thiết bị để bạn có thể quay lại bất cứ lúc nào.</p>
          <Link to="/cua-hang">Tiếp tục khám phá <span>→</span></Link>
        </div>
      </header>

      <section className="wishlist-collection" aria-label="Sản phẩm yêu thích">
        <div className="wishlist-collection__head">
          <div><span>Danh sách của bạn</span><strong>{wishlist.length} sản phẩm</strong></div>
          <p>Nhấn lại biểu tượng trái tim để bỏ sản phẩm khỏi danh sách.</p>
        </div>
        <div className="product-grid">
          {wishlist.map((product) => <ProductCard product={product} key={product.id} />)}
        </div>
      </section>
    </main>
  );
}
