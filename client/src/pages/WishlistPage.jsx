import React from "react";
import { Link } from "react-router-dom";
import { EmptyState, ProductCard } from "../components/Common";
import { useShop } from "../context/ShopContext";

export default function WishlistPage() {
  const { wishlist } = useShop();
  if (!wishlist.length) {
    return (
      <div className="page-narrow">
        <EmptyState
          symbol="♡"
          title="Chưa có món nào được lưu"
          copy="Nhấn biểu tượng trái tim trên sản phẩm để giữ lại những lựa chọn bạn thích."
          action={<Link className="button button--dark" to="/cua-hang">Khám phá sản phẩm</Link>}
        />
      </div>
    );
  }
  return (
    <div className="section wishlist-page">
      <header className="page-title-row"><div><p className="eyebrow">Saved for later</p><h1>Danh sách yêu thích</h1><p>{wishlist.length} món bạn đang để mắt tới.</p></div></header>
      <div className="product-grid">{wishlist.map((product) => <ProductCard product={product} key={product.id} />)}</div>
    </div>
  );
}
