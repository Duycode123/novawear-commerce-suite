# NOVAWEAR Sites deployment

Gói xuất bản hợp nhất hai giao diện đã build và API Cloudflare Worker:

- Cửa hàng tại `/`
- Cổng nhân viên/quản trị tại `/ops`
- API tại `/api`
- Dữ liệu bền vững qua D1 binding `DB`

## Chuẩn bị và kiểm tra

Từ thư mục gốc dự án, build `client` và `admin` trước. Trong thư mục này:

```powershell
npm run prepare:assets
npm run db:generate
npm run build
npm test
```

`scripts/prepare-assets.mjs` chỉ sao chép ảnh và tệp thật sự được giao diện mới sử dụng, đồng thời tạo dữ liệu khởi đầu cho Worker. `tests/worker-smoke.mjs` kiểm tra trọn luồng trên máy chủ cục bộ đã chạy bằng cấu hình `wrangler.local.jsonc`.

Không lưu khóa bí mật trong mã nguồn. Mỗi kho dữ liệu D1 tự tạo bí mật ký phiên đăng nhập ở lần khởi tạo đầu tiên.

## Cấu hình SePay

- Build giao diện khách với `REACT_APP_SEPAY_BANK`, `REACT_APP_SEPAY_ACCOUNT` và `REACT_APP_SEPAY_ACCOUNT_NAME`.
- Đặt bí mật `SEPAY_WEBHOOK_API_KEY` cho Worker.
- Trong SePay, khai báo webhook `https://ten-mien-cua-ban/api/payments/sepay/webhook` và dùng cùng API key.
- Không cấu hình tài khoản thật thì giao diện chỉ hiển thị chế độ thử nghiệm, tránh khách chuyển nhầm tiền.
