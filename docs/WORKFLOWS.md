# NOVAWEAR - Quy trình nghiệp vụ

Tài liệu này mô tả luồng vận hành của cửa hàng, cổng NOVA OPS và API. Quy tắc ở backend là nguồn sự thật; giao diện chỉ hiển thị và gửi yêu cầu hợp lệ.

## 1. Luồng khách hàng

### 1.1. Khám phá và chọn sản phẩm

1. Khách xem trang chủ, Nam, Nữ, Ưu đãi, Blog hoặc tìm kiếm.
2. Bộ lọc được áp dụng trên dữ liệu sản phẩm đang `active`; sản phẩm nháp/lưu trữ không xuất hiện công khai.
3. Trang chi tiết hiển thị giá, giá niêm yết, phần trăm giảm thực tế, màu, size, tồn kho tổng và tồn kho theo biến thể.
4. Nếu sản phẩm có biến thể, khách phải chọn đúng tổ hợp màu–size đang tồn tại. Backend từ chối tổ hợp không có hoặc đã hết hàng.
5. Số sao và “đã bán” chỉ được tính từ đánh giá hợp lệ và đơn đã giao/thanh toán, không lấy số bịa trên giao diện.

### 1.2. Giỏ hàng và thanh toán

1. Khách thêm sản phẩm, chọn biến thể và số lượng; giỏ hàng kiểm tra lại tồn kho khi mở và khi đặt.
2. Khách đã đăng nhập được lấy tên, email, số điện thoại và địa chỉ đã lưu. Có thể chọn địa chỉ đã lưu hoặc nhập địa chỉ dùng một lần cho đơn hiện tại.
3. Địa chỉ chỉ cần xác thực bản đồ khi khách **cập nhật địa chỉ hồ sơ**; đơn hàng không bắt khách xác thực lại địa chỉ đã chọn ở mọi lần mua.
4. Khách vãng lai nhập thông tin nhận hàng và phải xác minh email bằng OTP trước khi tạo đơn. Nếu email đã thuộc tài khoản, hệ thống yêu cầu đăng nhập.
5. Backend tự tính lại giá sản phẩm, phí vận chuyển, hạng thành viên, mã ưu đãi và tổng tiền; không tin tổng tiền do trình duyệt gửi.
6. `requestId` chống bấm đặt hàng nhiều lần. Cùng một yêu cầu chỉ tạo một đơn.

### 1.3. Hai phương thức thanh toán

- **COD:** tạo đơn ở trạng thái `pending`, thanh toán `pending`. Đơn chỉ được xác nhận xử lý khi nhân viên/admin tiếp nhận; khi chuyển `delivered`, hệ thống ghi nhận COD đã thanh toán.
- **SePay/chuyển khoản:** tạo đơn `pending`, thanh toán `awaiting` và giữ tồn kho trong thời hạn cấu hình. Trang kết quả hiển thị QR, số tài khoản, chủ tài khoản, số tiền và nội dung chuyển khoản ngay trong vùng nhìn đầu tiên. SePay webhook/polling khớp đúng mã đơn + số tiền rồi chuyển thanh toán sang `paid` và tự động xác nhận đơn. Không hiển thị “hoàn tất thanh toán” trước khi có giao dịch thành công.

Nếu QR hết hạn, khách không chuyển tiền, đơn chuyển `expired`, tồn kho và lượt dùng coupon được hoàn lại một lần. Giao dịch đến muộn hoặc không khớp không tự gắn vào đơn; admin phải đối soát thủ công.

### 1.4. Theo dõi, hủy, đánh giá và đổi trả

1. Khách xem đơn tại Tài khoản hoặc tra cứu bằng mã vận đơn + số điện thoại. Timeline công khai chỉ chứa thông tin cần cho khách.
2. Trạng thái đơn đi theo thứ tự: `pending` → `confirmed` → `packing` → `ready_to_ship` → `shipping` → `delivered`. Nhánh ngoại lệ là `delivery_failed` → `shipping` hoặc `cancelled`.
3. Khách chỉ được hủy khi đơn còn `pending`/`confirmed`; luôn kèm kiểm tra `version` để tránh hủy nhầm khi nhân viên vừa cập nhật.
4. Chỉ đơn `delivered` mới mở quyền đánh giá. Mỗi tài khoản chỉ đánh giá một lần cho mỗi sản phẩm trong đơn; đánh giá được gắn nhãn đã mua.
5. Trong 30 ngày từ lúc giao, khách tạo yêu cầu đổi/trả, chọn sản phẩm/số lượng và lý do. Không cho vượt số lượng đã mua hoặc tạo hai yêu cầu đang xử lý cho cùng đơn.
6. Đổi trả đi theo `requested` → `approved` → `receiving` → `inspecting` → `completed` hoặc `rejected/cancelled`. Chỉ sau kiểm tra đạt yêu cầu mới nhập lại kho và tạo khoản hoàn tiền.

## 2. Luồng nhân viên

1. Nhân viên đăng nhập từ cổng chung. API xác minh JWT, role và tài khoản còn hoạt động; tài khoản nội bộ không được dùng để đặt hàng như khách.
2. Nhân viên vào Workspace để xem ca làm, công việc được giao, đơn được phân công và hộp thư hỗ trợ. Đơn đã giao cho người khác sẽ bị giới hạn quyền xem/sửa.
3. Nhân viên nhận đơn chưa phân công hoặc đơn đã gán cho mình, kiểm tra thanh toán, tồn kho và thông tin giao hàng.
4. Mỗi thay đổi trạng thái gửi `expectedVersion`; nếu có người khác cập nhật trước, API trả xung đột để tải lại thay vì ghi đè.
5. Khi chuyển sang `shipping`, bắt buộc có đơn vị vận chuyển và mã vận đơn. Khi giao thất bại phải ghi lý do; khi hoàn tất phải cập nhật kết quả giao.
6. Nhân viên có thể trả lời chat, đổi trạng thái yêu cầu hỗ trợ và xử lý công việc được giao; không được quản lý tài khoản, coupon, giá vốn, hoàn tiền hoặc phân quyền.
7. Chấm công dùng ngày theo múi giờ Việt Nam; thao tác đóng ca và hoàn thành việc được ghi vào nhật ký.

## 3. Luồng admin

### 3.1. Tài khoản và phân quyền

- Admin đăng nhập vào NOVA OPS, quản lý nhân viên, trạng thái tài khoản, vai trò và liên kết hồ sơ nhân viên.
- Staff chỉ có quyền vận hành trong phạm vi được giao. Admin là vai trò duy nhất được sửa catalog, coupon, nhà cung cấp, phiếu nhập, hoàn tiền và audit log.
- Đổi mật khẩu, reset mật khẩu, đăng xuất và khóa tài khoản đều làm mất hiệu lực phiên JWT cũ.
- Môi trường production khóa tài khoản demo và bắt buộc bootstrap admin riêng; không dùng mật khẩu mẫu trên web thật.

### 3.2. Catalog, ưu đãi và nội dung

1. Admin tạo/sửa/lưu trữ sản phẩm, kiểm tra SKU duy nhất, danh mục tồn tại, giá hợp lệ, trạng thái, đối tượng Nam/Nữ/Unisex và thời hạn ưu đãi.
2. Sản phẩm có biến thể phải được quản lý theo size–màu; tồn kho tổng được đồng bộ từ biến thể.
3. Xóa sản phẩm đã có giao dịch sẽ chuyển sang `archived` để không phá lịch sử đơn.
4. Admin tạo/sửa/xóa danh mục, bài viết và coupon. Coupon kiểm tra loại, giá trị, thời gian, giới hạn lượt dùng và không được sửa giới hạn thấp hơn số đã dùng.
5. Trang Ưu đãi lấy đúng sản phẩm đang giảm, phần trăm giảm và thời gian kết thúc từ database; banner chỉ mô tả nhóm ưu đãi thật, không tự bịa sản phẩm.

### 3.3. Kho và mua hàng

1. Admin xem tồn kho tổng, tồn kho biến thể, lịch sử nhập–xuất và cảnh báo sắp hết/hết hàng.
2. Điều chỉnh thủ công phải có số lượng khác 0, lý do và chọn biến thể nếu sản phẩm có biến thể.
3. Tạo phiếu nhập cần nhà cung cấp, sản phẩm không trùng, số lượng nguyên dương, giá nhập hợp lệ và ngày dự kiến hợp lệ.
4. Chỉ admin được nhận phiếu nhập; thao tác nhận một lần, cộng tồn kho và cập nhật giá vốn.

### 3.4. Đơn hàng, thanh toán và hoàn tiền

1. Admin xem toàn bộ đơn; staff chỉ thấy đơn chưa gán hoặc đơn của mình.
2. Admin/staff chuyển trạng thái theo state machine, bắt buộc ghi lý do cho hủy/giao thất bại và thông tin vận chuyển trước khi giao.
3. Payment status do SePay, COD hoặc quy trình hoàn tiền cập nhật; giao diện vận hành không được tự sửa payment status tùy ý.
4. Giao dịch SePay lệch tiền/mã hoặc đến sau hạn nằm trong hàng đợi đối soát. Admin kiểm tra sao kê, nhập mã chứng từ + lý do, rồi mới xác nhận thanh toán.
5. Hoàn tiền chỉ thực hiện sau khi yêu cầu đổi/trả đã hoàn tất hoặc đơn bị hủy có `refund_pending`; cần mã tham chiếu và ghi nhận người thao tác.
6. Mọi thao tác nhạy cảm ghi audit log và gửi thông báo/email trạng thái cho khách.

## 4. Ngoại lệ bắt buộc phải xử lý

- OTP sai, hết hạn hoặc vượt số lần thử: từ chối và yêu cầu gửi mã mới.
- JWT sai issuer/audience, hết hạn, sai role hoặc token version cũ: từ chối 401/403.
- Bấm đặt hàng lặp, hai người mua cùng tồn kho hoặc phiên admin cũ: dùng idempotency, kiểm tra tồn kho và optimistic locking.
- Email/Cloudinary/SePay chưa cấu hình: không giả vờ thành công; hiển thị lỗi cấu hình rõ ràng và chặn chức năng phụ thuộc.
- Production phải dùng PostgreSQL/Neon; `/api/health/ready` là endpoint kiểm tra readiness, không dùng kho JSON cục bộ.
- API không công khai giá vốn, ghi chú nội bộ, mã giao dịch nhạy cảm, người phụ trách hoặc dữ liệu audit cho khách.

## 5. Checklist nghiệm thu trước khi mở bán

- Tạo tài khoản → xác minh email → đăng nhập → đổi mật khẩu → đăng xuất.
- Khách vãng lai xác minh email → COD; khách đăng nhập dùng địa chỉ đã lưu → SePay QR.
- Quét QR thành công → webhook/polling → đơn được xác nhận; QR hết hạn → hoàn tồn kho.
- Cùng lúc đặt hết một biến thể → chỉ đơn hợp lệ được giữ tồn.
- Admin giao đơn qua đủ trạng thái; staff không vượt quyền; khách thấy timeline/email.
- Giao thành công → đánh giá; yêu cầu đổi trả 30 ngày → kiểm tra → hoàn tiền → nhập kho.
- Thêm/sửa/lưu trữ sản phẩm, coupon, category, phiếu nhập; dữ liệu vẫn còn sau restart và hiện trong PostgreSQL.
- Kiểm tra desktop/mobile, các nút không che chữ, QR và thông báo lỗi đều nhìn thấy ngay.
