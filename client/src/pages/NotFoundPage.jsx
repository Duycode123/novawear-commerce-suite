import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <strong>404</strong>
      <p className="eyebrow">Lost, but still in style</p>
      <h1>Trang này đã đi đâu đó.</h1>
      <p>Đường dẫn có thể đã thay đổi hoặc nội dung không còn tồn tại.</p>
      <div><Link className="button button--dark" to="/">Về trang chủ</Link><Link className="button button--outline" to="/cua-hang">Đi mua sắm</Link></div>
    </div>
  );
}
