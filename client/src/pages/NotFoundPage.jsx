import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <div className="not-found__copy">
        <strong>404</strong>
        <p className="eyebrow">Lạc đường nhưng vẫn có gu</p>
        <h1>Trang bạn tìm kiếm<br />đang ở một nơi khác.</h1>
        <p>Có thể trang đã được chuyển hoặc không còn tồn tại. Đừng lo, lúc khám phá thời trang vẫn còn bên dưới.</p>
        <div><Link className="button button--accent" to="/">Về trang chủ</Link><Link className="button button--outline" to="/cua-hang">Tiếp tục mua sắm</Link></div>
      </div>
      <div className="not-found__visual"><img src="/Images/nova-v3/not-found.webp" alt="Minh họa thời trang NOVAWEAR" width="1448" height="1086" loading="lazy" decoding="async" /></div>
    </div>
  );
}
