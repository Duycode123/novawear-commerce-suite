export const BRAND = {
  name: "NOVAWEAR",
  portal: "NOVA OPS",
  storefrontUrl:
    process.env.REACT_APP_STOREFRONT_URL ||
    (process.env.NODE_ENV === "production" ? "/" : "http://localhost:3000"),
};

export const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatDate = (value, withTime = false) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));

export const resolveAsset = (src) => {
  if (!src) return "";
  if (/^https?:\/\//.test(src) || src.startsWith("data:")) return src;
  const base = BRAND.storefrontUrl.replace(/\/$/, "");
  return `${base}${src.startsWith("/") ? src : `/${src}`}`;
};

export const ORDER_STATUS = {
  pending: { label: "Đã tiếp nhận", tone: "amber" },
  confirmed: { label: "Đã xác nhận", tone: "blue" },
  packing: { label: "Đang đóng gói", tone: "purple" },
  ready_to_ship: { label: "Chờ bàn giao", tone: "amber" },
  shipping: { label: "Đang giao", tone: "blue" },
  delivery_failed: { label: "Giao chưa thành công", tone: "red" },
  delivered: { label: "Giao thành công", tone: "green" },
  cancelled: { label: "Đã hủy", tone: "red" },
};

export const PAYMENT_STATUS = {
  pending: { label: "Chờ thu COD", tone: "amber" },
  awaiting: { label: "Chờ chuyển khoản", tone: "amber" },
  paid: { label: "Đã thanh toán", tone: "green" },
  refund_pending: { label: "Chờ hoàn tiền", tone: "purple" },
  refunded: { label: "Đã hoàn tiền", tone: "blue" },
  partially_refunded: { label: "Hoàn tiền một phần", tone: "blue" },
  expired: { label: "Hết hạn thanh toán", tone: "red" },
  failed: { label: "Thanh toán thất bại", tone: "red" },
  cancelled: { label: "Đã hủy thanh toán", tone: "neutral" },
  review_required: { label: "Cần đối soát thanh toán", tone: "red" },
};

export const RETURN_STATUS = {
  requested: { label: "Đã tiếp nhận", tone: "amber" },
  approved: { label: "Đã chấp thuận", tone: "blue" },
  receiving: { label: "Đang nhận hàng hoàn", tone: "purple" },
  inspecting: { label: "Đang kiểm tra", tone: "amber" },
  completed: { label: "Đã hoàn tất", tone: "green" },
  rejected: { label: "Đã từ chối", tone: "red" },
  cancelled: { label: "Khách đã hủy", tone: "neutral" },
};

export const EMPLOYEE_STATUS = {
  active: { label: "Đang làm việc", tone: "green" },
  on_leave: { label: "Đang nghỉ phép", tone: "amber" },
  inactive: { label: "Ngừng hoạt động", tone: "red" },
};
