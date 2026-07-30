# NOVAWEAR Commerce Suite

Bộ ứng dụng bán hàng thời trang đã được tách thành ba phần độc lập nhưng dùng chung dữ liệu:

- **Cửa hàng** (`client`): trang chủ, danh mục, tìm kiếm/lọc, chi tiết sản phẩm, yêu thích, giỏ hàng, thanh toán, tài khoản, lịch sử và theo dõi đơn.
- **NOVA OPS** (`admin`): bảng điều hành, khu vực nhân viên, chấm công, công việc, đơn hàng, sản phẩm, tồn kho, nhập hàng, khách hàng, nhân viên, tài khoản và hộp thư hỗ trợ.
- **API** (`BackEnd/server`): xác thực, phân quyền khách hàng/nhân viên/quản trị, quản lý dữ liệu, kiểm tra tồn kho, mã giảm giá, đơn hàng và nhật ký hoạt động.

## Bản trực tuyến

- Cửa hàng: `https://novawear-commerce.turkey-glow-5k.chatgpt.site`
- Nhân viên / quản trị: `https://novawear-commerce.turkey-glow-5k.chatgpt.site/ops`

Bản này đang để riêng tư cho chủ sở hữu. Dữ liệu trực tuyến được lưu bền vững bằng D1 và tách biệt với tệp dữ liệu chạy trên máy.

## Khởi chạy

Yêu cầu Node.js 18 trở lên.

```powershell
npm run setup
npm run dev
```

Sau khi khởi động:

- Cửa hàng: `http://localhost:3000`
- Nhân viên / quản trị: `http://localhost:3001`
- API: `http://localhost:5000/api/health`

Nhấn `Ctrl+C` để dừng cả ba phần.

## Đăng nhập chung và phân quyền

Tất cả vai trò đăng nhập tại một địa chỉ:

```text
http://localhost:3000/dang-nhap
```

Sau khi API xác minh JWT, hệ thống tự chuyển theo `role`:

- `customer` → tài khoản mua sắm tại `http://localhost:3000/tai-khoan`
- `staff` → không gian nhân viên tại `http://localhost:3001/workspace`
- `admin` → bảng điều khiển quản trị tại `http://localhost:3001`

Nếu mở thẳng `http://localhost:3001/login`, hệ thống cũng chuyển về cổng đăng nhập chung. API chỉ bàn giao một mã ngẫu nhiên có hiệu lực 60 giây và dùng đúng một lần; JWT không còn xuất hiện trên URL. Phiên đăng nhập được giữ trong tab hiện tại và tự mất khi đóng tab.

JWT truy cập có thời hạn mặc định 30 phút, bị vô hiệu hóa khi đổi mật khẩu và luôn được kiểm tra `issuer`, `audience`, thuật toán cùng phiên bản token.

## Tài khoản dùng thử

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Quản trị | `admin@novawear.vn` | `Admin@123` |
| Nhân viên | `staff@novawear.vn` | `Staff@123` |
| Khách hàng | `demo@novawear.vn` | `Demo@123` |

## Đổi tên thương hiệu

Các thông tin cần đổi đã được gom vào:

- Cửa hàng: `client/src/config/site.js`
- Cổng vận hành: `admin/src/config.js`
- Dữ liệu mặc định và thông tin hỗ trợ: `BackEnd/server/data/seed.js`
- Tiêu đề chia sẻ/tìm kiếm: `client/public/index.html` và `admin/public/index.html`

Đổi các giá trị `NOVAWEAR`, email, số điện thoại và địa chỉ ở những tệp trên, sau đó thay `client/public/og.png`.

## PostgreSQL và cách xem bảng trong VS Code

Khi `DB_TYPE=postgres`, API kết nối PostgreSQL và tự tạo các bảng trong schema `public`:

- `novawear_users`
- `novawear_products`
- `novawear_categories`
- `novawear_orders`
- `novawear_customers`
- `novawear_employees`
- `novawear_reviews`
- `novawear_coupons`
- `novawear_news`
- `novawear_returns`
- `novawear_app_state` (snapshot giao dịch của ứng dụng)

Các bảng nghiệp vụ có cột rõ ràng và được đồng bộ lại sau mỗi lần Admin thêm, sửa hoặc xóa dữ liệu. Cột `data` giữ bản ghi JSON đầy đủ cho những thuộc tính mở rộng như biến thể, ảnh và danh sách sản phẩm trong đơn.

Trong tiện ích Database của VS Code, mở:

```text
postgres (database) → Schemas → public → Tables
```

Sau khi backend khởi động, bấm **Refresh** tại database hoặc mục **Tables**. Cần chắc chắn kết nối đúng database có tên trùng với `DB_NAME` trong `BackEnd/server/.env`.

Nếu dùng chế độ dự phòng `DB_TYPE=json`, dữ liệu sẽ được lưu tại `BackEnd/server/data/store.json` và PostgreSQL không được cập nhật.

Để chạy thật, đặt `JWT_SECRET` ngẫu nhiên tối thiểu 32 ký tự và cấu hình `CORS_ORIGINS` theo tên miền thực tế.

## Email xác minh và xác nhận đơn hàng

Đăng ký tài khoản phải nhập mã 6 số nhận qua email. Khách không đăng nhập cũng phải xác minh email trước khi tạo đơn; mã có hiệu lực 10 phút, tối đa 5 lần thử và chỉ dùng một lần. Sau khi tạo đơn, hệ thống gửi mã đơn, mã tra cứu và tổng thanh toán về đúng email đã xác minh.

Điền cấu hình SMTP trong `BackEnd/server/.env`:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-account@gmail.com
SMTP_PASSWORD=your-app-password
MAIL_FROM="NOVAWEAR <your-account@gmail.com>"
MAIL_REPLY_TO=your-support-email@gmail.com
EXPOSE_VERIFICATION_CODE=false
```

Với Gmail, dùng App Password thay cho mật khẩu tài khoản. Khi SMTP chưa được cấu hình hoặc gửi thất bại, API không tạo tài khoản mới và không cho khách vãng lai vượt qua bước xác minh.

## Tư vấn size

Công cụ tại `/chon-size` tách bảng nam/nữ và áo/quần. Thuật toán ưu tiên số đo cơ thể (ngực cho áo, eo/mông cho quần), sau đó mới đối chiếu chiều cao, cân nặng và sở thích phom. Kết quả có mức tin cậy, cảnh báo khi gần ranh giới hai size và không lưu số đo người dùng.

Bảng chung chỉ là điểm khởi đầu. Với sản phẩm có phom đặc biệt, người dùng vẫn phải đối chiếu mục kiểu dáng và bảng thông số riêng trên trang chi tiết sản phẩm.

Chạy toàn bộ kiểm tra:

```powershell
npm run check
```

SMS và hãng vận chuyển chưa được đưa vào cấu hình vì dự án hiện không có nhà cung cấp tương ứng. Lưu trữ ảnh Cloudinary đã được nối đầy đủ cho ảnh sản phẩm, avatar, ảnh đánh giá và ảnh bằng chứng đổi trả; giao diện tải ảnh tự ẩn khi `CLOUDINARY_ENABLED=false`.

### Thanh toán SePay

Luồng chuyển khoản lấy thông tin tài khoản từ backend, tạo QR riêng cho từng đơn, dùng nội dung thanh toán duy nhất, chống webhook trùng và tự cập nhật trạng thái đơn. Chỉ cần điền nhóm `SEPAY_*` trong `BackEnd/server/.env`; frontend không chứa số tài khoản. Khi thiếu bất kỳ trường bắt buộc nào, lựa chọn SePay tự ẩn và API từ chối tạo đơn chuyển khoản.

### Google/Facebook OAuth và Cloudinary

- OAuth dùng `state` một lần, Google PKCE và mã trao đổi nội bộ có hiệu lực 60 giây; JWT không xuất hiện trên URL.
- Bật riêng từng nhà cung cấp bằng `GOOGLE_OAUTH_ENABLED` hoặc `FACEBOOK_OAUTH_ENABLED`, sau đó điền đủ client ID, secret và callback URL. Nút đăng nhập chỉ hiện với nhà cung cấp đã cấu hình hợp lệ.
- Bật tải ảnh bằng `CLOUDINARY_ENABLED=true`, rồi điền `CLOUDINARY_URL` hoặc bộ `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Backend kiểm tra cấu hình khi khởi động. Một tích hợp được bật nhưng thiếu khóa bắt buộc sẽ làm quá trình khởi động dừng với thông báo rõ trường còn thiếu.
