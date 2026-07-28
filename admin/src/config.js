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
  pending: { label: "Chờ xác nhận", tone: "amber" },
  confirmed: { label: "Đã xác nhận", tone: "blue" },
  packing: { label: "Đang đóng gói", tone: "purple" },
  shipping: { label: "Đang giao", tone: "blue" },
  delivered: { label: "Đã giao", tone: "green" },
  cancelled: { label: "Đã hủy", tone: "red" },
};

export const EMPLOYEE_STATUS = {
  active: { label: "Đang làm việc", tone: "green" },
  on_leave: { label: "Đang nghỉ phép", tone: "amber" },
  inactive: { label: "Ngừng hoạt động", tone: "red" },
};
