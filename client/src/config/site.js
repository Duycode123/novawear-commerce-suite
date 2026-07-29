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

export const SEPAY = {
  bank: process.env.REACT_APP_SEPAY_BANK || "MBBank",
  accountNumber: process.env.REACT_APP_SEPAY_ACCOUNT || "0000000000",
  accountName: process.env.REACT_APP_SEPAY_ACCOUNT_NAME || "NOVAWEAR DEMO",
  configured: Boolean(process.env.REACT_APP_SEPAY_ACCOUNT),
};

export const buildSepayQrUrl = ({ amount, description }) => {
  const query = new URLSearchParams({
    acc: SEPAY.accountNumber,
    bank: SEPAY.bank,
    amount: String(Math.round(Number(amount || 0))),
    des: String(description || "").toUpperCase().replace(/[^A-Z0-9]/g, ""),
    template: "compact",
    showinfo: "true",
    fullacc: "true",
    holder: SEPAY.accountName,
    store: SITE.name,
  });
  return `https://vietqr.app/img?${query.toString()}`;
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
  pending: { label: "Chờ xác nhận", tone: "amber" },
  confirmed: { label: "Đã xác nhận", tone: "blue" },
  packing: { label: "Đang đóng gói", tone: "purple" },
  shipping: { label: "Đang giao", tone: "blue" },
  delivered: { label: "Đã giao", tone: "green" },
  cancelled: { label: "Đã hủy", tone: "red" },
};
