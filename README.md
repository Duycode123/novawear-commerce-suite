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

## Dữ liệu và cấu hình

API dùng kho dữ liệu JSON có lưu bền vững để dự án chạy ngay mà không cần cài MySQL. Lần chạy đầu sẽ tạo `BackEnd/server/data/store.json` từ dữ liệu mẫu. Để chạy thật, sao chép `BackEnd/server/.env.example` thành `.env`, đặt `JWT_SECRET` dài và riêng tư, rồi cấu hình `CORS_ORIGINS` theo tên miền thực tế.

Chạy toàn bộ kiểm tra:

```powershell
npm run check
```

Thanh toán trực tuyến, email/SMS, hãng vận chuyển và lưu trữ ảnh đám mây đã có điểm nối trong luồng nghiệp vụ nhưng cần tài khoản/khóa API của nhà cung cấp trước khi bật trên môi trường thật.

### Thanh toán SePay

Luồng chuyển khoản đã có QR động, nội dung thanh toán riêng cho từng đơn, webhook chống ghi nhận trùng và tự cập nhật trạng thái đơn. Sao chép `client/.env.example` và `BackEnd/server/.env.example` sang tệp `.env` tương ứng, sau đó điền tài khoản ngân hàng cùng `SEPAY_WEBHOOK_API_KEY` thật trước khi nhận thanh toán.
