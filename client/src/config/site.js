export const SITE = {
  name: "NOVAWEAR",
  shortName: "NOVA",
  tagline: "Đồ mặc đẹp. Sống nhẹ tênh.",
  description: "Trang phục thường nhật có chất liệu dễ chịu, phom dáng linh hoạt và tinh thần riêng.",
  email: "hello@novawear.vn",
  phone: "1900 0000",
  address: "28 Nguyễn Văn Tráng, Quận 1, TP. Hồ Chí Minh",
  freeShippingThreshold: 699000,
  adminUrl:
    process.env.REACT_APP_ADMIN_URL ||
    (process.env.NODE_ENV === "production" ? "/ops" : "http://localhost:3001"),
};

export const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatDate = (value, options = {}) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  }).format(new Date(value));

export const ORDER_STATUS = {
  pending: { label: "Đã tiếp nhận", tone: "amber" },
  confirmed: { label: "Đã xác nhận", tone: "blue" },
  packing: { label: "Đang đóng gói", tone: "purple" },
  ready_to_ship: { label: "Chờ bàn giao vận chuyển", tone: "amber" },
  shipping: { label: "Đang giao", tone: "blue" },
  delivery_failed: { label: "Giao chưa thành công", tone: "red" },
  delivered: { label: "Giao thành công", tone: "green" },
  cancelled: { label: "Đã hủy", tone: "red" },
};

export const PAYMENT_STATUS = {
  pending: { label: "Thanh toán khi nhận hàng", tone: "amber" },
  awaiting: { label: "Chờ chuyển khoản", tone: "amber" },
  paid: { label: "Đã thanh toán", tone: "green" },
  refund_pending: { label: "Đang xử lý hoàn tiền", tone: "purple" },
  refunded: { label: "Đã hoàn tiền", tone: "blue" },
  partially_refunded: { label: "Đã hoàn tiền một phần", tone: "blue" },
  expired: { label: "Hết hạn thanh toán", tone: "red" },
  failed: { label: "Thanh toán thất bại", tone: "red" },
  cancelled: { label: "Thanh toán đã hủy", tone: "neutral" },
  review_required: { label: "Đang đối soát thanh toán", tone: "red" },
};

export const RETURN_STATUS = {
  requested: "Đã tiếp nhận yêu cầu",
  approved: "Đã chấp thuận",
  receiving: "Đang nhận hàng hoàn",
  inspecting: "Đang kiểm tra sản phẩm",
  completed: "Đã hoàn tất",
  rejected: "Đã từ chối",
  cancelled: "Bạn đã hủy yêu cầu",
};
