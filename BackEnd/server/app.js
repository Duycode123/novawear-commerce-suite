const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { JsonStore } = require("./lib/store");
const { createMailer } = require("./lib/mailer");
const { createCloudinaryService } = require("./lib/cloudinary");
const { createOAuthService } = require("./lib/oauth");
const { createSepayTransactionLookup } = require("./lib/sepay");
const { hashPassword, verifyPassword, sanitizeUser } = require("./lib/security");
const { enforceProductionIdentityPolicy } = require("./lib/production-identity");

const ORDER_STATUS_LABELS = {
  pending: "Đã tiếp nhận",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  ready_to_ship: "Chờ bàn giao vận chuyển",
  shipping: "Đang giao hàng",
  delivery_failed: "Giao hàng chưa thành công",
  delivered: "Giao thành công",
  cancelled: "Đã hủy",
};

const ALLOWED_ORDER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packing", "cancelled"],
  packing: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipping", "cancelled"],
  shipping: ["delivered", "delivery_failed"],
  delivery_failed: ["shipping", "cancelled"],
  delivered: [],
  cancelled: [],
};

const PAYMENT_STATUS_LABELS = {
  pending: "Chờ thanh toán COD",
  awaiting: "Chờ chuyển khoản",
  paid: "Đã thanh toán",
  refund_pending: "Chờ hoàn tiền",
  refunded: "Đã hoàn tiền",
  partially_refunded: "Đã hoàn tiền một phần",
  failed: "Thanh toán thất bại",
  expired: "Đã hết hạn thanh toán",
  cancelled: "Đã hủy thanh toán",
  review_required: "Cần đối soát thanh toán",
};

const RETURN_STATUS_LABELS = {
  requested: "Đã tiếp nhận yêu cầu",
  approved: "Đã chấp thuận",
  receiving: "Đang nhận hàng hoàn",
  inspecting: "Đang kiểm tra sản phẩm",
  completed: "Đã hoàn tất",
  rejected: "Đã từ chối",
  cancelled: "Khách hàng đã hủy",
};

const ALLOWED_RETURN_TRANSITIONS = {
  requested: ["approved", "rejected", "cancelled"],
  approved: ["receiving", "rejected"],
  receiving: ["inspecting", "rejected"],
  inspecting: ["completed", "rejected"],
  completed: [],
  rejected: [],
  cancelled: [],
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Keep the format permissive for Vietnamese/international numbers, but require
// at least one digit so punctuation-only values cannot pass checkout/profile
// validation.
const phonePattern = /^(?=.*\d)[0-9+\s.-]{9,15}$/;
const MEMBERSHIP_TIERS = [
  {
    key: "Member",
    minSpend: 0,
    discountPercent: 0,
    freeShippingThreshold: 699000,
    benefits: ["Theo dõi đơn hàng tập trung", "Đổi size miễn phí lần đầu trong 30 ngày"],
  },
  {
    key: "Silver",
    minSpend: 2000000,
    discountPercent: 2,
    freeShippingThreshold: 499000,
    benefits: ["Tự động giảm 2% giá sản phẩm", "Miễn phí giao tiêu chuẩn từ 499.000đ", "Nhận ưu đãi thành viên sớm"],
  },
  {
    key: "Gold",
    minSpend: 5000000,
    discountPercent: 5,
    freeShippingThreshold: 0,
    benefits: ["Tự động giảm 5% giá sản phẩm", "Miễn phí giao tiêu chuẩn mọi đơn", "Ưu tiên hỗ trợ và nhận ưu đãi sớm"],
  },
];
const appTimeZone = process.env.APP_TIME_ZONE || "Asia/Ho_Chi_Minh";

function localDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function slugify(value) {
  return normalizeText(value)
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function asMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

function asPositiveInt(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function asNonNegativeInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function validPassword(value, { minLength = 10, requireSpecial = false } = {}) {
  const password = String(value || "");
  return password.length >= minLength
    && password.length <= 128
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && (!requireSpecial || /[^A-Za-z0-9]/.test(password));
}

function normalizePaymentCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function safeTextEqual(actual, expected) {
  const actualBuffer = Buffer.from(String(actual || ""));
  const expectedBuffer = Buffer.from(String(expected || ""));
  return actualBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function createToken(user, secret) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      ver: Number(user.tokenVersion || 0),
      type: "access",
      jti: crypto.randomUUID(),
    },
    secret,
    {
      algorithm: "HS256",
      audience: "novawear-app",
      issuer: "novawear-api",
      expiresIn: process.env.JWT_EXPIRES_IN || "30m",
    },
  );
}

function createVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function createTrackingCode(orders, year) {
  let code;
  do {
    code = `NVA${String(year).slice(-2)}${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  } while (orders.some((item) => normalizeText(item.trackingCode) === normalizeText(code)));
  return code;
}

function hashVerificationCode(email, code, secret) {
  return hashOneTimeCode("account", email, code, secret);
}

function hashOneTimeCode(purpose, email, code, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${String(purpose)}:${normalizeText(email)}:${String(code)}`)
    .digest("hex");
}

function publicProduct(product, categories) {
  const category = categories.find((item) => item.id === product.categoryId);
  const { cost, ...safeProduct } = product;
  return {
    ...safeProduct,
    category: category ? { id: category.id, name: category.name, slug: category.slug, audience: category.audience || "all" } : null,
  };
}

function publicProductCard(product, categories) {
  const category = categories.find((item) => item.id === product.categoryId);
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    audience: product.audience,
    price: product.price,
    comparePrice: product.comparePrice,
    saleEndsAt: product.saleEndsAt,
    stock: product.stock,
    featured: Boolean(product.featured),
    badge: product.badge || "",
    image: product.image,
    colors: product.colors || [],
    sizes: product.sizes || [],
    rating: Number(product.rating || 0),
    reviewCount: Number(product.reviewCount || 0),
    sold: Number(product.sold || 0),
    createdAt: product.createdAt,
    category: category ? {
      id: category.id,
      name: category.name,
      slug: category.slug,
      audience: category.audience || "all",
    } : null,
  };
}

function cachePublicResponse(res, browserSeconds = 30, edgeSeconds = 180) {
  res.setHeader(
    "Cache-Control",
    `public, max-age=${browserSeconds}, s-maxage=${edgeSeconds}, stale-while-revalidate=600`,
  );
}

function publicOrder(order) {
  const {
    internalNote,
    assigneeId,
    userId,
    customerId,
    stockReservedAt,
    stockRestoredAt,
    checkoutRequestId,
    guestCheckoutJti,
    emailNotification,
    paymentTransaction,
    paymentReconciliation,
    paymentReviewReason,
    couponUsageCountedAt,
    couponUsageRestoredAt,
    ...safeOrder
  } = order;
  return {
    ...safeOrder,
    timeline: (order.timeline || []).map(({ internalNote: _internalNote, actorId: _actorId, ...event }) => event),
  };
}

function publicReturn(returnRequest) {
  const {
    internalNote,
    assigneeId,
    userId,
    customerId,
    inspectionResult,
    refundNote,
    inventoryDisposition,
    inventoryDispositionAt,
    exchangeReservedAt,
    exchangeReleasedAt,
    stockRestockedAt,
    ...safeReturn
  } = returnRequest;
  return {
    ...safeReturn,
    timeline: (returnRequest.timeline || []).map(({ internalNote: _internalNote, actorId: _actorId, ...event }) => event),
  };
}

function ratingStats(productId, reviews) {
  const published = reviews.filter((item) => item.productId === productId && item.status === "published");
  if (!published.length) return { rating: 0, reviewCount: 0 };
  const average = published.reduce((sum, item) => sum + Number(item.rating || 0), 0) / published.length;
  return { rating: Math.round(average * 10) / 10, reviewCount: published.length };
}

function completedOrder(order) {
  return order.status === "delivered" && ["paid", "partially_refunded"].includes(order.paymentStatus);
}

function orderSalesByProduct(orders) {
  const result = new Map();
  orders
    .filter(completedOrder)
    .forEach((order) => order.items.forEach((line) => {
      result.set(line.productId, (result.get(line.productId) || 0) + Number(line.quantity || 0));
    }));
  return result;
}

function customerTier(totalSpent) {
  return [...MEMBERSHIP_TIERS]
    .reverse()
    .find((item) => Number(totalSpent || 0) >= item.minSpend)?.key || "Member";
}

function membershipProfile(totalSpent = 0) {
  const safeTotal = Math.max(0, Number(totalSpent || 0));
  const tier = customerTier(safeTotal);
  const tierIndex = MEMBERSHIP_TIERS.findIndex((item) => item.key === tier);
  const current = MEMBERSHIP_TIERS[tierIndex] || MEMBERSHIP_TIERS[0];
  const next = MEMBERSHIP_TIERS[tierIndex + 1] || null;
  const progressStart = current.minSpend;
  const progressRange = next ? Math.max(1, next.minSpend - progressStart) : 1;
  return {
    ...current,
    tier: current.key,
    totalSpent: safeTotal,
    nextTier: next?.key || null,
    nextTierMinSpend: next?.minSpend || null,
    amountToNextTier: next ? Math.max(0, next.minSpend - safeTotal) : 0,
    progressPercent: next
      ? Math.min(100, Math.max(0, Math.round(((safeTotal - progressStart) / progressRange) * 100)))
      : 100,
  };
}

function rebuildCustomerMetrics(store, customerId) {
  const customer = store.data.customers.find((item) => item.id === customerId);
  if (!customer) return;
  const completed = store.data.orders.filter((order) => (
    order.customerId === customerId && completedOrder(order)
  ));
  const orderValue = (order) => Math.max(0, Number(order.total || 0) - Number(order.refundedAmount || 0));
  customer.totalSpent = completed.reduce((sum, order) => sum + orderValue(order), 0);
  customer.orderCount = completed.filter((order) => orderValue(order) > 0).length;
  customer.tier = customerTier(customer.totalSpent);
}

function chatContactMatchesUser(contact, user) {
  if (!contact || contact.channel !== "chat" || !user) return false;
  return contact.userId === user.id
    || Boolean(user.customerId && contact.customerId === user.customerId);
}

function contactTime(contact, field) {
  const value = contact?.[field];
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function syncChatContactIdentity(contact, user) {
  if (!contact || !user) return contact;
  contact.userId = user.id;
  contact.customerId = user.customerId || contact.customerId || null;
  contact.name = user.name;
  contact.email = normalizeText(user.email);
  contact.phone = user.phone || "";
  contact.guestTokenHash = null;
  contact.messages = (contact.messages || []).map((message) => (
    message.sender === "customer"
      ? { ...message, senderId: user.id, senderName: user.name }
      : message
  ));
  return contact;
}

function mergeChatConversationsForUser(store, user) {
  const activeContacts = store.data.contacts
    .filter((contact) => !contact.mergedIntoId && chatContactMatchesUser(contact, user))
    .sort((a, b) => (
      contactTime(b, "lastMessageAt")
      - contactTime(a, "lastMessageAt")
    ));
  if (!activeContacts.length) return null;

  const canonical = activeContacts[0];
  syncChatContactIdentity(canonical, user);
  if (activeContacts.length === 1) return canonical;

  const messageIds = new Set();
  canonical.messages = activeContacts
    .flatMap((contact) => contact.messages || [])
    .filter((message) => {
      if (!message?.id || messageIds.has(message.id)) return false;
      messageIds.add(message.id);
      return true;
    })
    .sort((a, b) => (
      new Date(a.createdAt || 0).getTime()
      - new Date(b.createdAt || 0).getTime()
    ));
  syncChatContactIdentity(canonical, user);

  const statuses = activeContacts.map((contact) => contact.status);
  canonical.status = statuses.includes("in_progress")
    ? "in_progress"
    : (statuses.includes("new") ? "new" : "resolved");
  canonical.operationsUnreadCount = activeContacts.reduce(
    (sum, contact) => sum + Math.max(0, Number(contact.operationsUnreadCount || 0)),
    0,
  );
  canonical.customerUnreadCount = activeContacts.reduce(
    (sum, contact) => sum + Math.max(0, Number(contact.customerUnreadCount || 0)),
    0,
  );

  const assignedContact = activeContacts.find((contact) => contact.assigneeId);
  canonical.assigneeId = canonical.assigneeId || assignedContact?.assigneeId || null;
  canonical.assigneeName = canonical.assigneeName || assignedContact?.assigneeName || null;
  canonical.createdAt = activeContacts
    .map((contact) => contact.createdAt)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b))[0] || canonical.createdAt;
  canonical.lastMessageAt = canonical.messages.at(-1)?.createdAt
    || activeContacts
      .map((contact) => contact.lastMessageAt || contact.updatedAt || contact.createdAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0]
    || canonical.lastMessageAt;
  canonical.updatedAt = canonical.lastMessageAt || canonical.updatedAt;
  canonical.message = canonical.messages.at(-1)?.body || canonical.message;

  const duplicateIds = activeContacts.slice(1).map((contact) => contact.id);
  canonical.mergedContactIds = [...new Set([
    ...(canonical.mergedContactIds || []),
    ...duplicateIds,
  ])];
  for (const duplicate of activeContacts.slice(1)) {
    duplicate.mergedIntoId = canonical.id;
    duplicate.operationsUnreadCount = 0;
    duplicate.customerUnreadCount = 0;
  }

  for (const notification of store.data.notifications || []) {
    if (!duplicateIds.includes(notification.contactId)) continue;
    notification.contactId = canonical.id;
    if (notification.href && notification.href.includes("/support?open=")) {
      notification.href = `/support?open=${encodeURIComponent(canonical.id)}`;
    }
  }
  return canonical;
}

function mergeAuthenticatedChatConversations(store) {
  for (const user of store.data.users || []) {
    if (user.role === "customer") mergeChatConversationsForUser(store, user);
  }
}

function resolveStoredContact(store, id) {
  let contact = store.data.contacts.find((item) => item.id === id);
  const visited = new Set();
  while (contact?.mergedIntoId && !visited.has(contact.id)) {
    visited.add(contact.id);
    contact = store.data.contacts.find((item) => item.id === contact.mergedIntoId);
  }
  return contact || null;
}

function ensureDataShape(store) {
  const collections = [
    "returns",
    "notifications",
    "contacts",
    "suppliers",
    "inventoryMovements",
    "tasks",
    "attendance",
    "coupons",
    "auditLogs",
    "paymentTransactions",
  ];
  collections.forEach((name) => {
    if (!Array.isArray(store.data[name])) store.data[name] = [];
  });
  store.data.coupons.forEach((coupon) => {
    if (coupon.usageLimit === undefined) coupon.usageLimit = 0;
    if (coupon.usedCount === undefined) coupon.usedCount = 0;
    if (!coupon.startsAt) coupon.startsAt = new Date(0).toISOString();
  });
  store.data.products.forEach((product) => {
    if (!Array.isArray(product.variants)) product.variants = [];
  });
  store.data.orders.forEach((order) => {
    if (!Number.isFinite(Number(order.version)) || Number(order.version) < 1) order.version = 1;
    if (!Array.isArray(order.timeline)) order.timeline = [];
    order.timeline = order.timeline.map((entry, index) => ({
      id: entry.id || `legacy-${order.id}-${index + 1}`,
      eventType: entry.eventType || "status",
      status: entry.status || order.status,
      paymentStatus: entry.paymentStatus || order.paymentStatus,
      label: entry.label || ORDER_STATUS_LABELS[entry.status] || "Đơn hàng được cập nhật",
      note: String(entry.note || ""),
      internalNote: String(entry.internalNote || ""),
      actorId: entry.actorId || null,
      actorName: entry.actorName || "Hệ thống NOVAWEAR",
      actorRole: entry.actorRole || "system",
      source: entry.source || "system",
      at: entry.at || order.updatedAt || order.createdAt || new Date().toISOString(),
    }));
    if (!order.shipment) {
      order.shipment = { carrier: "", trackingNumber: "", estimatedDeliveryAt: null };
    }
    if (!order.stockReservedAt && order.status !== "cancelled") order.stockReservedAt = order.createdAt;
    if (order.status === "cancelled" && !order.stockRestoredAt) order.stockRestoredAt = order.updatedAt || order.createdAt;
    if (order.status === "delivered" && !order.deliveredAt) {
      order.deliveredAt = order.timeline.find((entry) => entry.status === "delivered")?.at || order.updatedAt;
    }
    if (order.status === "delivered" && ["pending", "awaiting"].includes(order.paymentStatus)) {
      order.paymentStatus = "review_required";
      order.paymentReviewReason = "Dữ liệu cũ ghi nhận đã giao hàng nhưng chưa có bằng chứng thu tiền.";
    }
  });
  store.data.notifications.forEach((notification) => {
    if (!Array.isArray(notification.readBy)) notification.readBy = [];
  });
  store.data.contacts.forEach((contact, contactIndex) => {
    contact.channel = contact.channel || "form";
    contact.status = ["new", "in_progress", "resolved"].includes(contact.status)
      ? contact.status
      : "new";
    contact.messages = Array.isArray(contact.messages) && contact.messages.length
      ? contact.messages
      : (contact.message ? [{
        id: `legacy-${contact.id || contactIndex + 1}-1`,
        sender: "customer",
        senderId: contact.userId || null,
        senderName: contact.name || "Khách hàng",
        body: String(contact.message),
        createdAt: contact.createdAt || new Date().toISOString(),
      }] : []);
    contact.lastMessageAt = contact.lastMessageAt
      || contact.messages[contact.messages.length - 1]?.createdAt
      || contact.updatedAt
      || contact.createdAt
      || new Date().toISOString();
    contact.operationsUnreadCount = Math.max(0, Number(contact.operationsUnreadCount || 0));
    contact.customerUnreadCount = Math.max(0, Number(contact.customerUnreadCount || 0));
  });
  store.data.returns.forEach((returnRequest) => {
    if (!Number.isFinite(Number(returnRequest.version)) || Number(returnRequest.version) < 1) {
      returnRequest.version = 1;
    }
    if (!Array.isArray(returnRequest.timeline)) returnRequest.timeline = [];
    returnRequest.timeline = returnRequest.timeline.map((entry, index) => ({
      id: entry.id || `legacy-${returnRequest.id}-${index + 1}`,
      status: entry.status || returnRequest.status,
      label: entry.label || RETURN_STATUS_LABELS[entry.status] || "Yêu cầu đổi trả được cập nhật",
      note: entry.status === "requested" && String(entry.note || "").includes("KhĂ¡ch hĂ")
        ? "Khách hàng gửi yêu cầu."
        : String(entry.note || ""),
      internalNote: String(entry.internalNote || ""),
      actorId: entry.actorId || null,
      actorName: entry.actorName || "Hệ thống NOVAWEAR",
      actorRole: entry.actorRole || "system",
      source: entry.source || "system",
      at: entry.at || returnRequest.updatedAt || returnRequest.createdAt || new Date().toISOString(),
    }));
    if (returnRequest.refundStatus === undefined) returnRequest.refundStatus = "not_applicable";
  });
  store.data.users.forEach((user) => {
    if (user.tokenVersion === undefined) user.tokenVersion = 0;
    if (user.emailVerifiedAt === undefined) {
      user.emailVerifiedAt = user.status === "active"
        ? (user.createdAt || new Date().toISOString())
        : null;
    }
  });
  mergeAuthenticatedChatConversations(store);
}

function couponAvailabilityError(coupon, subtotal = null, now = new Date()) {
  if (!coupon || !coupon.active) {
    return { status: 404, code: "COUPON_UNAVAILABLE", message: "Mã ưu đãi không tồn tại hoặc đang tạm dừng." };
  }
  const startsAt = new Date(coupon.startsAt || 0);
  const expiresAt = new Date(coupon.expiresAt || 0);
  if (Number.isNaN(startsAt.getTime()) || startsAt > now) {
    return { status: 409, code: "COUPON_NOT_STARTED", message: "Mã ưu đãi chưa đến thời gian sử dụng." };
  }
  if (Number.isNaN(expiresAt.getTime()) || expiresAt < now) {
    return { status: 410, code: "COUPON_EXPIRED", message: "Mã ưu đãi đã hết hạn." };
  }
  const usageLimit = Math.max(0, Number(coupon.usageLimit || 0));
  const usedCount = Math.max(0, Number(coupon.usedCount || 0));
  if (usageLimit > 0 && usedCount >= usageLimit) {
    return { status: 409, code: "COUPON_USAGE_LIMIT_REACHED", message: "Mã ưu đãi đã hết lượt sử dụng." };
  }
  if (subtotal !== null && asMoney(subtotal) < asMoney(coupon.minOrder)) {
    return {
      status: 400,
      code: "COUPON_MINIMUM_NOT_MET",
      message: `Đơn hàng cần tối thiểu ${asMoney(coupon.minOrder).toLocaleString("vi-VN")}đ để dùng mã này.`,
    };
  }
  return null;
}

function couponBenefit(coupon, subtotal, shippingFee) {
  let discount = 0;
  let nextShippingFee = shippingFee;
  if (coupon.type === "percent") {
    const calculated = Math.round(subtotal * asMoney(coupon.value) / 100);
    const maximum = asMoney(coupon.maxDiscount);
    discount = maximum > 0 ? Math.min(calculated, maximum) : calculated;
  }
  if (coupon.type === "fixed") {
    const value = asMoney(coupon.value);
    const maximum = asMoney(coupon.maxDiscount);
    discount = Math.min(value, maximum > 0 ? maximum : value, subtotal);
  }
  if (coupon.type === "shipping") {
    nextShippingFee = Math.max(0, shippingFee - asMoney(coupon.value));
  }
  return { discount, shippingFee: nextShippingFee };
}

function restoreCouponUsage(store, order, at = new Date().toISOString()) {
  if (!order.couponCode || !order.couponUsageCountedAt || order.couponUsageRestoredAt) return false;
  const coupon = (store.data.coupons || []).find((item) => item.code === order.couponCode);
  if (coupon) coupon.usedCount = Math.max(0, Number(coupon.usedCount || 0) - 1);
  order.couponUsageRestoredAt = at;
  return true;
}

function productVariant(product, size, color) {
  if (!Array.isArray(product.variants) || !product.variants.length) return null;
  return product.variants.find((item) => String(item.size) === String(size) && String(item.color) === String(color));
}

function syncProductStock(product) {
  if (Array.isArray(product.variants) && product.variants.length) {
    product.stock = product.variants.reduce((sum, item) => sum + asMoney(item.stock), 0);
  }
}

function changeProductStock(product, quantity, size, color) {
  const variant = productVariant(product, size, color);
  if (variant) {
    variant.stock = Math.max(0, Number(variant.stock || 0) + quantity);
    syncProductStock(product);
    return;
  }
  product.stock = Math.max(0, Number(product.stock || 0) + quantity);
}

function publicActor(actor, source = "operations") {
  return {
    actorId: actor?.id || null,
    actorName: actor?.name || (source === "system" ? "Hệ thống NOVAWEAR" : "Đội ngũ NOVAWEAR"),
    actorRole: actor?.role || source,
    source,
  };
}

function touchOrder(order, at = new Date().toISOString()) {
  order.updatedAt = at;
  order.version = Number(order.version || 0) + 1;
  return at;
}

function appendOrderEvent(order, details = {}) {
  const at = details.at || new Date().toISOString();
  const actor = publicActor(details.actor, details.source);
  const event = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventType: details.eventType || "status",
    status: details.status || order.status,
    paymentStatus: details.paymentStatus || order.paymentStatus,
    label: details.label || ORDER_STATUS_LABELS[details.status || order.status] || "Đơn hàng được cập nhật",
    note: String(details.note || "").trim().slice(0, 500),
    internalNote: String(details.internalNote || "").trim().slice(0, 1000),
    at,
    ...actor,
  };
  order.timeline = Array.isArray(order.timeline) ? order.timeline : [];
  order.timeline.push(event);
  return event;
}

function createNotification(store, details) {
  store.data.notifications = store.data.notifications || [];
  const notification = {
    id: store.nextId("notifications", "ntf-"),
    audience: details.audience,
    userId: details.userId || null,
    customerId: details.customerId || null,
    orderId: details.orderId || null,
    returnId: details.returnId || null,
    contactId: details.contactId || null,
    type: details.type || "order_status",
    title: String(details.title || "Đơn hàng được cập nhật").slice(0, 160),
    message: String(details.message || "").slice(0, 500),
    href: String(details.href || ""),
    readAt: null,
    readBy: [],
    createdAt: details.createdAt || new Date().toISOString(),
  };
  store.data.notifications.unshift(notification);
  store.data.notifications = store.data.notifications.slice(0, 2000);
  return notification;
}

function notifyOrderChange(store, order, event, options = {}) {
  const message = options.message || event.note || event.label;
  createNotification(store, {
    audience: "customer",
    userId: order.userId,
    customerId: order.customerId,
    orderId: order.id,
    type: options.type || event.eventType || "order_status",
    title: `${order.id} · ${event.label}`,
    message,
    href: `/tai-khoan?tab=orders&order=${encodeURIComponent(order.id)}`,
    createdAt: event.at,
  });
  createNotification(store, {
    audience: "operations",
    orderId: order.id,
    type: options.type || event.eventType || "order_status",
    title: `${order.id} · ${event.label}`,
    message: options.operationsMessage || `${order.customer?.name || "Khách hàng"}: ${message}`,
    href: `/orders?open=${encodeURIComponent(order.id)}`,
    createdAt: event.at,
  });
}

function touchReturn(returnRequest, at = new Date().toISOString()) {
  returnRequest.updatedAt = at;
  returnRequest.version = Number(returnRequest.version || 0) + 1;
  return at;
}

function appendReturnEvent(returnRequest, details = {}) {
  const at = details.at || new Date().toISOString();
  const actor = publicActor(details.actor, details.source);
  const event = {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: details.status || returnRequest.status,
    label: details.label || RETURN_STATUS_LABELS[details.status || returnRequest.status]
      || "Yêu cầu đổi trả được cập nhật",
    note: String(details.note || "").trim().slice(0, 500),
    internalNote: String(details.internalNote || "").trim().slice(0, 1000),
    at,
    ...actor,
  };
  returnRequest.timeline = Array.isArray(returnRequest.timeline) ? returnRequest.timeline : [];
  returnRequest.timeline.push(event);
  return event;
}

function notifyReturnChange(store, returnRequest, order, event) {
  createNotification(store, {
    audience: "customer",
    userId: returnRequest.userId || order?.userId,
    customerId: returnRequest.customerId || order?.customerId,
    orderId: returnRequest.orderId,
    type: "return_status",
    title: `${returnRequest.id} · ${event.label}`,
    message: event.note || event.label,
    href: "/doi-tra",
    createdAt: event.at,
  });
  createNotification(store, {
    audience: "operations",
    orderId: returnRequest.orderId,
    returnId: returnRequest.id,
    type: "return_status",
    title: `${returnRequest.id} · ${event.label}`,
    message: `${order?.customer?.name || "Khách hàng"}: ${event.note || event.label}`,
    href: `/returns?open=${encodeURIComponent(returnRequest.id)}`,
    createdAt: event.at,
  });
}

function addInventoryMovement(store, details) {
  store.data.inventoryMovements = store.data.inventoryMovements || [];
  store.data.inventoryMovements.unshift({
    id: store.nextId("inventoryMovements", "mov-"),
    productId: details.product.id,
    size: String(details.size || ""),
    color: String(details.color || ""),
    quantity: Number(details.quantity || 0),
    reason: details.reason,
    orderId: details.orderId || null,
    returnId: details.returnId || null,
    before: Number(details.before || 0),
    after: Number(details.product.stock || 0),
    actorId: details.actor?.id || null,
    createdAt: details.at || new Date().toISOString(),
  });
  store.data.inventoryMovements = store.data.inventoryMovements.slice(0, 2000);
}

function changeReturnItemStock(store, returnRequest, item, quantity, details = {}) {
  const product = store.data.products.find((entry) => entry.id === item.productId);
  if (!product) return false;
  const before = Number(product.stock || 0);
  changeProductStock(product, quantity, details.size || item.size, details.color || item.color);
  addInventoryMovement(store, {
    product,
    size: details.size || item.size,
    color: details.color || item.color,
    quantity,
    reason: details.reason,
    orderId: returnRequest.orderId,
    returnId: returnRequest.id,
    actor: details.actor,
    before,
  });
  return true;
}

function exchangeAvailabilityError(store, returnRequest) {
  for (const item of returnRequest.items || []) {
    const product = store.data.products.find((entry) => entry.id === item.productId);
    if (!product) return `Sản phẩm ${item.name} không còn tồn tại.`;
    const desiredSize = String(item.desiredSize || "").trim();
    const desiredColor = String(item.desiredColor || "").trim();
    if (!desiredSize || !desiredColor) return `Cần chọn size và màu muốn đổi cho ${item.name}.`;
    if (Array.isArray(product.sizes) && product.sizes.length && !product.sizes.includes(desiredSize)) {
      return `Size muốn đổi của ${item.name} không hợp lệ.`;
    }
    if (Array.isArray(product.colors) && product.colors.length && !product.colors.includes(desiredColor)) {
      return `Màu muốn đổi của ${item.name} không hợp lệ.`;
    }
    const variant = productVariant(product, desiredSize, desiredColor);
    if (Array.isArray(product.variants) && product.variants.length && !variant) {
      return `Tổ hợp size ${desiredSize} và màu ${desiredColor} của ${item.name} không còn bán.`;
    }
    const available = variant ? Number(variant.stock || 0) : Number(product.stock || 0);
    if (available < Number(item.quantity || 0)) {
      return `${item.name} (${desiredColor}, size ${desiredSize}) không còn đủ tồn kho để đổi.`;
    }
  }
  return null;
}

function reserveExchangeInventory(store, returnRequest, actor) {
  if (returnRequest.exchangeReservedAt) return;
  for (const item of returnRequest.items || []) {
    changeReturnItemStock(store, returnRequest, item, -Number(item.quantity || 0), {
      size: item.desiredSize,
      color: item.desiredColor,
      reason: `Giữ hàng cho yêu cầu đổi ${returnRequest.id}`,
      actor,
    });
  }
  returnRequest.exchangeReservedAt = new Date().toISOString();
}

function releaseExchangeInventory(store, returnRequest, actor) {
  if (!returnRequest.exchangeReservedAt || returnRequest.exchangeReleasedAt || returnRequest.status === "completed") return;
  for (const item of returnRequest.items || []) {
    changeReturnItemStock(store, returnRequest, item, Number(item.quantity || 0), {
      size: item.desiredSize,
      color: item.desiredColor,
      reason: `Hoàn giữ hàng do kết thúc yêu cầu đổi ${returnRequest.id}`,
      actor,
    });
  }
  returnRequest.exchangeReleasedAt = new Date().toISOString();
}

function restockReturnedItems(store, returnRequest, actor) {
  if (returnRequest.stockRestockedAt) return;
  for (const item of returnRequest.items || []) {
    changeReturnItemStock(store, returnRequest, item, Number(item.quantity || 0), {
      reason: `Nhập lại hàng hoàn từ yêu cầu ${returnRequest.id}`,
      actor,
    });
  }
  returnRequest.stockRestockedAt = new Date().toISOString();
}

function adjustOrderInventory(store, order, direction, reason, actor) {
  store.data.inventoryMovements = store.data.inventoryMovements || [];
  for (const line of order.items || []) {
    const product = store.data.products.find((item) => item.id === line.productId);
    if (!product) continue;
    const quantity = Number(line.quantity || 0) * direction;
    const before = Number(product.stock || 0);
    changeProductStock(product, quantity, line.size, line.color);
    store.data.inventoryMovements.unshift({
      id: store.nextId("inventoryMovements", "mov-"),
      productId: product.id,
      size: String(line.size || ""),
      color: String(line.color || ""),
      quantity,
      reason,
      orderId: order.id,
      before,
      after: Number(product.stock || 0),
      actorId: actor?.id || null,
      createdAt: new Date().toISOString(),
    });
  }
  store.data.inventoryMovements = store.data.inventoryMovements.slice(0, 2000);
}

function restoreOrderInventory(store, order, reason, actor) {
  if (order.stockRestoredAt) return false;
  adjustOrderInventory(store, order, 1, reason, actor);
  order.stockRestoredAt = new Date().toISOString();
  return true;
}

function validateOrderTransition(order, nextStatus, changes = {}) {
  if (!ORDER_STATUS_LABELS[nextStatus]) return "Trạng thái đơn hàng không hợp lệ.";
  const allowed = ALLOWED_ORDER_TRANSITIONS[order.status] || [];
  if (!allowed.includes(nextStatus)) {
    return `Không thể chuyển từ “${ORDER_STATUS_LABELS[order.status]}” sang “${ORDER_STATUS_LABELS[nextStatus]}”.`;
  }
  if (nextStatus === "confirmed" && order.paymentMethod === "bank" && order.paymentStatus !== "paid") {
    return "Đơn chuyển khoản chỉ được xác nhận sau khi SePay ghi nhận đủ tiền.";
  }
  if (nextStatus === "shipping") {
    const shipment = { ...(order.shipment || {}), ...(changes.shipment || {}) };
    if (String(shipment.carrier || "").trim().length < 2 || String(shipment.trackingNumber || "").trim().length < 4) {
      return "Cần nhập đơn vị vận chuyển và mã vận đơn trước khi bắt đầu giao.";
    }
  }
  if (nextStatus === "delivery_failed" && String(changes.reason || "").trim().length < 5) {
    return "Cần ghi rõ lý do giao hàng chưa thành công.";
  }
  if (nextStatus === "cancelled" && String(changes.reason || "").trim().length < 5) {
    return "Cần nhập lý do hủy đơn hàng.";
  }
  return null;
}

function applyOrderCancellation(store, order, details = {}) {
  const at = new Date().toISOString();
  restoreOrderInventory(store, order, `Hoàn kho do hủy đơn ${order.id}`, details.actor);
  restoreCouponUsage(store, order, at);
  order.status = "cancelled";
  order.cancelReason = String(details.reason || "Đơn hàng đã được hủy.").trim().slice(0, 500);
  order.cancelledAt = at;
  if (details.paymentStatus) {
    order.paymentStatus = details.paymentStatus;
  } else if (order.paymentStatus === "paid") {
    order.paymentStatus = "refund_pending";
  } else if (order.paymentStatus === "awaiting") {
    order.paymentStatus = "cancelled";
  } else if (order.paymentStatus === "pending") {
    order.paymentStatus = "cancelled";
  }
  touchOrder(order, at);
  const event = appendOrderEvent(order, {
    status: "cancelled",
    paymentStatus: order.paymentStatus,
    label: ORDER_STATUS_LABELS.cancelled,
    note: order.cancelReason,
    internalNote: details.internalNote,
    actor: details.actor,
    source: details.source || "operations",
    at,
  });
  notifyOrderChange(store, order, event, {
    type: "order_cancelled",
    message: order.paymentStatus === "refund_pending"
      ? `${order.cancelReason} Khoản đã thanh toán đang chờ được hoàn.`
      : order.cancelReason,
  });
  rebuildCustomerMetrics(store, order.customerId);
  return event;
}

function applyOrderTransition(store, order, nextStatus, details = {}) {
  if (nextStatus === "cancelled") return applyOrderCancellation(store, order, details);
  const at = new Date().toISOString();
  if (details.shipment) {
    order.shipment = {
      ...(order.shipment || {}),
      carrier: String(details.shipment.carrier || order.shipment?.carrier || "").trim().slice(0, 120),
      trackingNumber: String(details.shipment.trackingNumber || order.shipment?.trackingNumber || "").trim().slice(0, 120),
      estimatedDeliveryAt: details.shipment.estimatedDeliveryAt || order.shipment?.estimatedDeliveryAt || null,
    };
  }
  if (nextStatus === "ready_to_ship") order.readyToShipAt = at;
  if (nextStatus === "shipping") {
    order.shippedAt = order.shippedAt || at;
    order.deliveryAttempts = Number(order.deliveryAttempts || 0) + 1;
    if (order.shipment) order.shipment.lastHandedToCarrierAt = at;
  }
  if (nextStatus === "delivery_failed") {
    order.lastDeliveryFailure = { reason: String(details.reason || "").trim().slice(0, 500), at };
  }
  if (nextStatus === "delivered") {
    order.deliveredAt = at;
    if (order.paymentMethod === "cod" && order.paymentStatus === "pending") {
      order.paymentStatus = "paid";
      order.paidAt = at;
    }
  }
  order.status = nextStatus;
  touchOrder(order, at);
  const event = appendOrderEvent(order, {
    status: nextStatus,
    paymentStatus: order.paymentStatus,
    label: ORDER_STATUS_LABELS[nextStatus],
    note: details.reason || details.publicNote,
    internalNote: details.internalNote,
    actor: details.actor,
    source: details.source || "operations",
    at,
  });
  notifyOrderChange(store, order, event, {
    message: details.publicNote || details.reason || ORDER_STATUS_LABELS[nextStatus],
  });
  rebuildCustomerMetrics(store, order.customerId);
  return event;
}

function applyOrderPaymentPaid(store, order, details = {}) {
  if (order.paymentStatus === "paid") return null;
  const at = details.at || new Date().toISOString();
  order.paymentStatus = "paid";
  order.paidAt = at;
  if (details.transaction) order.paymentTransaction = details.transaction;
  const paymentEvent = appendOrderEvent(order, {
    eventType: "payment",
    status: order.status,
    paymentStatus: "paid",
    label: details.label || "Thanh toán thành công",
    note: details.note || "Hệ thống đã ghi nhận đủ số tiền thanh toán.",
    actor: details.actor,
    source: details.source || "system",
    at,
  });
  notifyOrderChange(store, order, paymentEvent, { type: "payment_paid", message: paymentEvent.note });
  let finalEvent = paymentEvent;
  if (order.status === "pending") {
    order.status = "confirmed";
    finalEvent = appendOrderEvent(order, {
      status: "confirmed",
      paymentStatus: "paid",
      label: ORDER_STATUS_LABELS.confirmed,
      note: "Đơn chuyển khoản được tự động xác nhận sau khi nhận đủ tiền.",
      actor: details.actor,
      source: details.source || "system",
      at,
    });
    notifyOrderChange(store, order, finalEvent, {
      type: "order_status",
      message: "Đơn hàng đã được xác nhận và sẽ chuyển sang khâu đóng gói.",
    });
  }
  touchOrder(order, at);
  rebuildCustomerMetrics(store, order.customerId);
  return finalEvent;
}

function createApp(options = {}) {
  const app = express();
  const dataFile = options.dataFile
    || process.env.DATA_FILE
    || path.join(__dirname, "data", "store.json");
  const store = options.store || new JsonStore(dataFile);
  ensureDataShape(store);
  store.data.customers.forEach((customer) => rebuildCustomerMetrics(store, customer.id));
  const configuredJwtSecret = String(options.jwtSecret || process.env.JWT_SECRET || "").trim();
  const unsafeProductionSecret = configuredJwtSecret.length < 32
    || /replace|change-me|example|secret/i.test(configuredJwtSecret);
  if (process.env.NODE_ENV === "production" && unsafeProductionSecret) {
    throw new Error("JWT_SECRET phải là chuỗi bí mật ngẫu nhiên có ít nhất 32 ký tự khi chạy production.");
  }
  enforceProductionIdentityPolicy(store, options.productionIdentity);
  // Persist startup repairs and identity-policy updates as well as exposing them
  // in memory. This keeps legacy payment reconciliation stable across restarts.
  store.save();
  const jwtSecret = configuredJwtSecret || "novawear-local-development-secret-change-me";
  const exposeVerificationCode = options.exposeVerificationCode
    ?? String(process.env.EXPOSE_VERIFICATION_CODE || "false").toLowerCase() === "true";
  const mailer = options.mailer || createMailer(options.mailerOptions);
  const cloudinaryService = options.cloudinaryService || createCloudinaryService();
  const oauthService = options.oauthService || createOAuthService();
  const sepayWebhookApiKey = String(options.sepayWebhookApiKey || process.env.SEPAY_WEBHOOK_API_KEY || "").trim();
  const validSepayWebhookKey = Boolean(
    sepayWebhookApiKey && !/replace-with|your-|example/i.test(sepayWebhookApiKey),
  );
  const sepayQr = {
    bankCode: String(options.sepayQr?.bankCode || process.env.SEPAY_QR_BANK_CODE || "").trim(),
    accountNumber: String(options.sepayQr?.accountNumber || process.env.SEPAY_QR_BANK_ACCOUNT || "").trim(),
    accountName: String(options.sepayQr?.accountName || process.env.SEPAY_QR_ACCOUNT_NAME || "").trim(),
    template: String(options.sepayQr?.template || process.env.SEPAY_QR_TEMPLATE || "compact").trim(),
  };
  const sepayApiPollingEnabled = options.sepayApiPollingEnabled
    ?? (Boolean(options.sepayTransactionLookup)
      || String(process.env.SEPAY_API_POLLING_ENABLED || "false").toLowerCase() === "true");
  const sepayTransactionLookup = options.sepayTransactionLookup || createSepayTransactionLookup({
    accessToken: options.sepayApiAccessToken,
    accountNumber: options.sepayApiAccountNumber || sepayQr.accountNumber,
  });
  const sepayApiConfigured = Boolean(
    sepayApiPollingEnabled
    && (typeof sepayTransactionLookup === "function" || sepayTransactionLookup?.configured),
  );
  const sepayConfigured = Boolean(
    (validSepayWebhookKey || sepayApiConfigured) && sepayQr.bankCode && sepayQr.accountNumber,
  );
  const requestBodyLimit = String(process.env.REQUEST_BODY_LIMIT || "1mb");
  const otpTtlSeconds = asPositiveInt(process.env.OTP_TTL_SECONDS, 600);
  const otpResendSeconds = asPositiveInt(process.env.OTP_RESEND_SECONDS, 60);
  const otpMaxAttempts = asPositiveInt(process.env.OTP_MAX_ATTEMPTS, 5);
  const authMaxAttempts = asPositiveInt(process.env.AUTH_MAX_ATTEMPTS, 5);
  const authLockSeconds = asPositiveInt(process.env.AUTH_LOCK_SECONDS, 60);
  const operationsHandoffTtlSeconds = asPositiveInt(process.env.OPERATIONS_HANDOFF_TTL_SECONDS, 60);
  const guestCheckoutTokenTtlSeconds = asPositiveInt(process.env.GUEST_CHECKOUT_TOKEN_TTL_SECONDS, 900);
  const orderPaymentExpirationSeconds = asPositiveInt(
    options.orderPaymentExpirationSeconds || process.env.ORDER_PAYMENT_EXPIRATION_SECONDS,
    1800,
  );
  const checkoutRequestWindowSeconds = asPositiveInt(process.env.CHECKOUT_REQUEST_WINDOW_SECONDS, 900);
  const checkoutMaxCodeRequests = asPositiveInt(process.env.CHECKOUT_MAX_CODE_REQUESTS, 5);
  const configuredOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      if (item === "*") return item;
      try {
        return new URL(item).origin;
      } catch (_error) {
        return item.replace(/\/$/, "");
      }
    });
  // Keep the public frontend origin in the allow-list even when CORS_ORIGINS
  // was copied from a local environment. This avoids a successful login being
  // blocked by the browser's preflight request after moving the API to Render.
  let frontendOrigin = "";
  try {
    frontendOrigin = new URL(String(process.env.FRONTEND_BASE_URL || "")).origin;
  } catch (_error) {
    frontendOrigin = "";
  }
  const allowedOrigins = [...new Set([
    ...configuredOrigins,
    ...(frontendOrigin ? [frontendOrigin] : []),
  ])];
  const authAttempts = new Map();
  const guestVerificationAttempts = new Map();
  const usedGuestCheckoutTokens = new Map();
  const operationsHandoffs = new Map();
  const oauthStates = new Map();
  const oauthExchanges = new Map();
  const registrationLocks = new Set();
  const checkoutRequestLimits = new Map();
  const publicRequestLimits = new Map();
  let lastSecurityPruneAt = 0;
  const dummyPasswordHash = hashPassword("Invalid-password-value-2026");

  function pruneTemporarySecurityState(now = Date.now()) {
    if (now - lastSecurityPruneAt < 60 * 1000) return;
    lastSecurityPruneAt = now;
    for (const [key, value] of operationsHandoffs) if (value.expiresAt <= now) operationsHandoffs.delete(key);
    for (const [key, value] of oauthStates) if (value.expiresAt <= now) oauthStates.delete(key);
    for (const [key, value] of oauthExchanges) if (value.expiresAt <= now) oauthExchanges.delete(key);
    for (const [key, value] of guestVerificationAttempts) if (value.expiresAt <= now) guestVerificationAttempts.delete(key);
    for (const [key, expiresAt] of usedGuestCheckoutTokens) if (expiresAt <= now) usedGuestCheckoutTokens.delete(key);
    for (const [key, timestamps] of checkoutRequestLimits) {
      const recent = timestamps.filter((timestamp) => now - timestamp < checkoutRequestWindowSeconds * 1000);
      if (recent.length) checkoutRequestLimits.set(key, recent);
      else checkoutRequestLimits.delete(key);
    }
    for (const [key, value] of authAttempts) {
      if (now - Number(value.updatedAt || 0) > 60 * 60 * 1000) authAttempts.delete(key);
    }
    for (const [key, value] of publicRequestLimits) if (value.resetAt <= now) publicRequestLimits.delete(key);
  }

  function notificationVisibleTo(notification, user) {
    if (user.role === "admin") return notification.audience === "operations";
    if (user.role === "staff") {
      if (notification.audience !== "operations" || !user.employeeId) return false;
      if (notification.returnId) {
        const returnRequest = store.data.returns.find((item) => item.id === notification.returnId);
        return !returnRequest?.assigneeId || returnRequest.assigneeId === user.employeeId;
      }
      if (notification.contactId) {
        const contact = store.data.contacts.find((item) => item.id === notification.contactId);
        return !contact?.assigneeId || contact.assigneeId === user.id;
      }
      if (notification.orderId) {
        const order = store.data.orders.find((item) => item.id === notification.orderId);
        return !order?.assigneeId || order.assigneeId === user.employeeId;
      }
      return true;
    }
    return notification.audience === "customer"
      && (notification.userId === user.id || notification.customerId === user.customerId);
  }

  function notificationReadAt(notification, user) {
    if (notification.audience === "operations") {
      return notification.readBy?.find((entry) => entry.userId === user.id)?.at || null;
    }
    return notification.readAt || null;
  }

  function notificationForUser(notification, user) {
    const { readBy: _readBy, userId: _userId, customerId: _customerId, ...safeNotification } = notification;
    return { ...safeNotification, readAt: notificationReadAt(notification, user) };
  }

  function queueOrderStatusEmail(order, event) {
    if (!order.customer?.email || typeof mailer.sendOrderStatusUpdate !== "function") return;
    Promise.resolve(mailer.sendOrderStatusUpdate({
      to: order.customer.email,
      order,
      event,
      paymentLabel: PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus,
    })).catch(() => {
      store.audit("status_email_failed", "order", order.id, { name: "Hệ thống email" });
      store.save();
    });
  }

  function queueReturnStatusEmail(returnRequest, order, event) {
    if (!order?.customer?.email || typeof mailer.sendReturnStatusUpdate !== "function") return;
    Promise.resolve(mailer.sendReturnStatusUpdate({
      to: order.customer.email,
      order,
      returnRequest,
      event,
    })).catch(() => {
      store.audit("status_email_failed", "return", returnRequest.id, { name: "Hệ thống email" });
      store.save();
    });
  }

  function expireAwaitingPaymentOrders() {
    const now = Date.now();
    const expired = [];
    for (const order of store.data.orders) {
      if (order.paymentMethod !== "bank" || order.paymentStatus !== "awaiting" || order.status !== "pending") continue;
      if (!order.paymentExpiresAt || new Date(order.paymentExpiresAt).getTime() > now) continue;
      const event = applyOrderCancellation(store, order, {
        actor: { name: "Hệ thống NOVAWEAR", role: "system" },
        source: "system",
        reason: "Đơn hàng tự động hủy vì đã hết thời gian chờ chuyển khoản.",
        paymentStatus: "expired",
      });
      store.audit("payment_expired", "order", order.id, { name: "Hệ thống NOVAWEAR" });
      queueOrderStatusEmail(order, event);
      expired.push(order);
    }
    if (expired.length) store.save();
    return expired;
  }

  function temporaryKey(value) {
    return crypto.createHmac("sha256", jwtSecret).update(String(value || "")).digest("hex");
  }

  function publicChatConversation(contact) {
    const {
      guestTokenHash: _guestTokenHash,
      operationsUnreadCount: _operationsUnreadCount,
      assigneeId: _assigneeId,
      mergedContactIds: _mergedContactIds,
      mergedIntoId: _mergedIntoId,
      ...safeContact
    } = contact;
    return {
      ...safeContact,
      messages: (contact.messages || []).map((message) => ({
        id: message.id,
        sender: message.sender,
        senderName: message.sender === "operations"
          ? "NOVAWEAR"
          : (message.senderName || contact.name || "Khách hàng"),
        body: message.body,
        createdAt: message.createdAt,
      })),
    };
  }

  function operationsChatConversation(contact) {
    const {
      guestTokenHash: _guestTokenHash,
      mergedContactIds: _mergedContactIds,
      mergedIntoId: _mergedIntoId,
      ...safeContact
    } = contact;
    const assignee = store.data.users.find((user) => user.id === contact.assigneeId);
    return {
      ...safeContact,
      assigneeName: assignee?.name || contact.assigneeName || null,
    };
  }

  function chatConversationForCustomer(req) {
    const requestedContact = store.data.contacts.find((item) => (
      item.id === req.params.id && item.channel === "chat"
    ));
    if (!requestedContact) return null;
    const contact = resolveStoredContact(store, requestedContact.id);
    if (!contact || contact.channel !== "chat") return null;
    const ownsAuthenticatedConversation = req.user?.role === "customer"
      && (
        contact.userId === req.user.id
        || (contact.customerId && contact.customerId === req.user.customerId)
      );
    if (ownsAuthenticatedConversation) return contact;
    const suppliedToken = String(req.headers["x-chat-token"] || "");
    if (
      suppliedToken
      && requestedContact.guestTokenHash
      && safeTextEqual(temporaryKey(suppliedToken), requestedContact.guestTokenHash)
    ) {
      return contact;
    }
    return null;
  }

  function appendChatMessage(contact, details) {
    const createdAt = details.createdAt || new Date().toISOString();
    const message = {
      id: `chat-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      sender: details.sender,
      senderId: details.senderId || null,
      senderName: details.senderName || (
        details.sender === "operations" ? "NOVAWEAR" : contact.name || "Khách hàng"
      ),
      body: String(details.body || "").trim().slice(0, 1000),
      createdAt,
    };
    contact.messages = Array.isArray(contact.messages) ? contact.messages : [];
    contact.messages.push(message);
    contact.message = message.body;
    contact.lastMessageAt = createdAt;
    contact.updatedAt = createdAt;
    return message;
  }

  function issueOperationsHandoff(user) {
    const code = crypto.randomBytes(32).toString("base64url");
    operationsHandoffs.set(temporaryKey(code), {
      userId: user.id,
      expiresAt: Date.now() + operationsHandoffTtlSeconds * 1000,
    });
    return code;
  }

  function createGuestCheckoutToken(email) {
    return jwt.sign(
      {
        sub: normalizeText(email),
        type: "guest_checkout",
        jti: crypto.randomUUID(),
      },
      jwtSecret,
      {
        algorithm: "HS256",
        audience: "novawear-checkout",
        issuer: "novawear-api",
        expiresIn: guestCheckoutTokenTtlSeconds,
      },
    );
  }

  function issueVerificationCode(user) {
    const code = createVerificationCode();
    const now = Date.now();
    user.verificationCodeHash = hashVerificationCode(user.email, code, jwtSecret);
    user.verificationExpiresAt = new Date(now + otpTtlSeconds * 1000).toISOString();
    user.verificationSentAt = new Date(now).toISOString();
    user.verificationAttempts = 0;
    return code;
  }

  function issuePasswordResetCode(user) {
    const code = createVerificationCode();
    const now = Date.now();
    user.passwordResetCodeHash = hashOneTimeCode("password-reset", user.email, code, jwtSecret);
    user.passwordResetExpiresAt = new Date(now + otpTtlSeconds * 1000).toISOString();
    user.passwordResetSentAt = new Date(now).toISOString();
    user.passwordResetAttempts = 0;
    return code;
  }

  function verificationResponse(user, code, message) {
    return {
      message,
      requiresVerification: true,
      email: user.email,
      expiresInSeconds: otpTtlSeconds,
      ...(exposeVerificationCode ? { verificationCode: code } : {}),
    };
  }

  app.locals.store = store;
  app.locals.mailer = mailer;
  app.locals.cloudinary = cloudinaryService;
  app.locals.oauth = oauthService;

  app.disable("x-powered-by");
  if (String(process.env.TRUST_PROXY || "false").toLowerCase() === "true") {
    app.set("trust proxy", 1);
  }
  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    if (req.path.startsWith("/api/auth")
      || req.path.startsWith("/api/checkout/verification")
      || req.path.startsWith("/api/orders/track/")
      || req.path.startsWith("/api/payments/sepay/orders/")) {
      res.setHeader("Cache-Control", "no-store");
    }
    next();
  });
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      const error = new Error("Nguồn truy cập chưa được cho phép.");
      error.status = 403;
      callback(error);
    },
    credentials: true,
  }));
  app.use(express.json({ limit: requestBodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: requestBodyLimit }));

  function optionalAuth(req, _res, next) {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) {
      req.user = null;
      next();
      return;
    }

    try {
      const payload = jwt.verify(token, jwtSecret, {
        algorithms: ["HS256"],
        audience: "novawear-app",
        issuer: "novawear-api",
      });
      const user = store.data.users.find((item) => item.id === payload.sub);
      const validVersion = user && Number(payload.ver || 0) === Number(user.tokenVersion || 0);
      req.user = user
        && user.status === "active"
        && Boolean(user.emailVerifiedAt)
        && payload.type === "access"
        && validVersion
        ? sanitizeUser(user)
        : null;
    } catch (_error) {
      req.user = null;
    }
    next();
  }

  function requireAuth(req, res, next) {
    optionalAuth(req, res, () => {
      if (!req.user) {
        res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
        return;
      }
      next();
    });
  }

  function allowRoles(...roles) {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này." });
        return;
      }
      if (req.user.mustChangePassword) {
        res.status(403).json({
          message: "Bạn cần đổi mật khẩu tạm trước khi sử dụng chức năng này.",
          code: "PASSWORD_CHANGE_REQUIRED",
        });
        return;
      }
      next();
    };
  }

  function rateLimitAuth(req, res, next) {
    const key = `${req.ip}:${normalizeText(req.body?.email)}`;
    const current = authAttempts.get(key);
    const timestamp = Date.now();
    pruneTemporarySecurityState(timestamp);
    if (current && current.blockedUntil > timestamp) {
      const seconds = Math.ceil((current.blockedUntil - timestamp) / 1000);
      res.status(429).json({ message: `Vui lòng thử lại sau ${seconds} giây.` });
      return;
    }
    req.authAttemptKey = key;
    next();
  }

  function fixedWindowLimit(bucket, maxRequests, windowSeconds, identify = (req) => req.ip || "unknown") {
    return (req, res, next) => {
      const now = Date.now();
      pruneTemporarySecurityState(now);
      const key = `${bucket}:${String(identify(req) || "unknown")}`;
      const current = publicRequestLimits.get(key);
      const entry = !current || current.resetAt <= now
        ? { count: 0, resetAt: now + windowSeconds * 1000 }
        : current;
      if (entry.count >= maxRequests) {
        const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
        res.setHeader("Retry-After", String(retryAfterSeconds));
        return res.status(429).json({
          message: `Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${retryAfterSeconds} giây.`,
        });
      }
      entry.count += 1;
      publicRequestLimits.set(key, entry);
      if (publicRequestLimits.size > 5000) {
        for (const [limitKey, value] of publicRequestLimits) {
          if (value.resetAt <= now) publicRequestLimits.delete(limitKey);
        }
      }
      next();
    };
  }

  const limitEmailDelivery = fixedWindowLimit("email-delivery", 20, 15 * 60);
  const limitOAuthStart = fixedWindowLimit("oauth-start", 30, 15 * 60);
  const limitOrderTracking = fixedWindowLimit("order-tracking", 60, 15 * 60);
  const limitPublicForms = fixedWindowLimit("public-forms", 20, 15 * 60);
  const limitChatReads = fixedWindowLimit(
    "chat-reads",
    300,
    15 * 60,
    (req) => req.user?.id || req.ip || "unknown",
  );
  const limitChatMessages = fixedWindowLimit(
    "chat-messages",
    40,
    15 * 60,
    (req) => req.user?.id || req.ip || "unknown",
  );
  const limitOrderCreation = fixedWindowLimit(
    "order-creation",
    12,
    15 * 60,
    (req) => req.user?.id || req.ip || "unknown",
  );
  const uploadRateWindowSeconds = asPositiveInt(process.env.UPLOAD_RATE_WINDOW_SECONDS, 15 * 60);
  const limitProductUploads = fixedWindowLimit(
    "product-uploads",
    asPositiveInt(process.env.UPLOAD_PRODUCT_RATE_LIMIT, 120),
    uploadRateWindowSeconds,
    (req) => req.user?.id || req.ip || "unknown",
  );
  const limitCustomerUploads = fixedWindowLimit(
    "customer-uploads",
    asPositiveInt(process.env.UPLOAD_CUSTOMER_RATE_LIMIT, 30),
    uploadRateWindowSeconds,
    (req) => req.user?.id || req.ip || "unknown",
  );

  function recordAuthFailure(key) {
    if (!key) return;
    if (authAttempts.size > 5000) {
      const now = Date.now();
      for (const [attemptKey, attempt] of authAttempts) {
        if (!attempt.blockedUntil || attempt.blockedUntil < now) authAttempts.delete(attemptKey);
      }
    }
    const current = authAttempts.get(key) || { count: 0, blockedUntil: 0, updatedAt: 0 };
    current.count += 1;
    current.updatedAt = Date.now();
    if (current.count >= authMaxAttempts) {
      current.blockedUntil = Date.now() + authLockSeconds * 1000;
      current.count = 0;
    }
    authAttempts.set(key, current);
  }

  function clearAuthFailures(key) {
    if (key) authAttempts.delete(key);
  }

  function notFound(res, entity = "Dữ liệu") {
    return res.status(404).json({ message: `${entity} không tồn tại.` });
  }

  function validateCustomer(customer) {
    if (!customer || !String(customer.name || "").trim()) return "Vui lòng nhập họ tên người nhận.";
    if (!phonePattern.test(String(customer.phone || ""))) return "Số điện thoại chưa đúng định dạng.";
    if (customer.email && !emailPattern.test(String(customer.email))) return "Email chưa đúng định dạng.";
    if (!String(customer.address || "").trim()) return "Vui lòng nhập địa chỉ nhận hàng.";
    return null;
  }

  async function registerHandler(req, res) {
    const name = String(req.body.name || req.body.ten_nguoi_dung || "").trim();
    const email = normalizeText(req.body.email);
    const phone = String(req.body.phone || req.body.sdt || "").trim();
    const password = String(req.body.password || req.body.mat_khau || "");

    if (name.length < 2) return res.status(400).json({ message: "Họ tên cần có ít nhất 2 ký tự." });
    if (!emailPattern.test(email)) return res.status(400).json({ message: "Email chưa đúng định dạng." });
    if (!phonePattern.test(phone)) return res.status(400).json({ message: "Số điện thoại chưa đúng định dạng." });
    if (!validPassword(password)) {
      return res.status(400).json({
        message: "Mật khẩu cần từ 10 đến 128 ký tự, gồm chữ hoa, chữ thường và số.",
      });
    }
    if (store.data.users.some((user) => normalizeText(user.email) === email)) {
      return res.status(409).json({ message: "Email này đã được sử dụng." });
    }
    if (registrationLocks.has(email)) {
      return res.status(409).json({ message: "Yêu cầu đăng ký cho email này đang được xử lý." });
    }
    registrationLocks.add(email);

    const existingCustomer = store.data.customers
      .find((item) => normalizeText(item.email) === email);
    if (existingCustomer && store.data.users.some((item) => item.customerId === existingCustomer.id)) {
      registrationLocks.delete(email);
      return res.status(409).json({ message: "Hồ sơ khách hàng này đã được liên kết với một tài khoản." });
    }
    const customerId = existingCustomer?.id || store.nextId("customers", "cus-");
    const userId = store.nextId("users", "usr-");
    const createdAt = new Date().toISOString();
    const customer = {
      ...(existingCustomer || {}),
      id: customerId,
      name,
      email,
      phone,
      address: existingCustomer?.address || "",
      tier: existingCustomer?.tier || "Member",
      totalSpent: Number(existingCustomer?.totalSpent || 0),
      orderCount: Number(existingCustomer?.orderCount || 0),
      status: "active",
      createdAt: existingCustomer?.createdAt || createdAt,
    };
    const user = {
      id: userId,
      name,
      email,
      phone,
      role: "customer",
      customerId,
      employeeId: null,
      status: "pending",
      emailVerifiedAt: null,
      tokenVersion: 0,
      passwordHash: hashPassword(password),
      createdAt,
    };

    const verificationCode = issueVerificationCode(user);
    try {
      await mailer.sendVerification({
        to: user.email,
        name: user.name,
        code: verificationCode,
        purpose: "account",
      });
    } catch (error) {
      if (!exposeVerificationCode) {
        registrationLocks.delete(email);
        return res.status(error.code === "EMAIL_NOT_CONFIGURED" ? 503 : 502).json({
          message: error.code === "EMAIL_NOT_CONFIGURED"
            ? "Hệ thống email chưa được cấu hình. Vui lòng liên hệ quản trị viên."
            : "Chưa thể gửi email xác minh. Vui lòng thử lại sau.",
          code: "EMAIL_DELIVERY_UNAVAILABLE",
        });
      }
    }

    if (existingCustomer) Object.assign(existingCustomer, customer);
    else store.data.customers.push(customer);
    store.data.users.push(user);
    registrationLocks.delete(email);
    store.audit("create", "user", user.id, sanitizeUser(user));
    store.save();
    clearAuthFailures(req.authAttemptKey);

    return res.status(201).json(verificationResponse(
      user,
      verificationCode,
      "Tài khoản đã được tạo. Mã xác minh đã được gửi tới email của bạn.",
    ));
  }

  function loginHandler(req, res) {
    const email = normalizeText(req.body.email);
    const password = String(req.body.password || req.body.mat_khau || "");
    const portal = String(req.body.portal || "customer");

    if (!email || !password) {
      recordAuthFailure(req.authAttemptKey);
      return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu." });
    }

    const user = store.data.users.find((item) => normalizeText(item.email) === email);
    const passwordMatches = verifyPassword(password, user?.passwordHash || dummyPasswordHash);
    if (!user || !passwordMatches) {
      recordAuthFailure(req.authAttemptKey);
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
    }
    if (!user.emailVerifiedAt || user.status === "pending") {
      return res.status(403).json({
        message: "Tài khoản chưa được xác minh.",
        code: "ACCOUNT_NOT_VERIFIED",
        requiresVerification: true,
        email: user.email,
      });
    }
    if (user.status !== "active") {
      return res.status(403).json({ message: "Tài khoản đang bị khóa." });
    }
    if (portal === "admin" && !["admin", "staff"].includes(user.role)) {
      return res.status(403).json({ message: "Tài khoản này không thuộc khu vực nhân viên." });
    }

    clearAuthFailures(req.authAttemptKey);
    store.audit("login", "user", user.id, sanitizeUser(user));
    store.save();
    if (["admin", "staff"].includes(user.role)) {
      return res.json({
        message: "Đăng nhập thành công. Đang chuyển tới khu vực vận hành.",
        operationsHandoffCode: issueOperationsHandoff(user),
        user: sanitizeUser(user),
      });
    }
    return res.json({
      message: "Đăng nhập thành công.",
      token: createToken(user, jwtSecret),
      user: sanitizeUser(user),
    });
  }

  app.post("/api/auth/verify", rateLimitAuth, (req, res) => {
    const email = normalizeText(req.body.email);
    const code = String(req.body.code || "").trim();
    const user = store.data.users.find((item) => normalizeText(item.email) === email);

    if (!user) return res.status(400).json({ message: "Email hoặc mã xác minh không hợp lệ." });
    if (user.emailVerifiedAt && user.status === "active") {
      return res.status(409).json({
        message: "Tài khoản đã được xác minh. Vui lòng đăng nhập bằng mật khẩu.",
        code: "ACCOUNT_ALREADY_VERIFIED",
      });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Mã xác minh phải gồm 6 chữ số." });
    }
    if (!user.verificationExpiresAt || new Date(user.verificationExpiresAt).getTime() < Date.now()) {
      return res.status(410).json({
        message: "Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới.",
        code: "VERIFICATION_EXPIRED",
      });
    }
    if (Number(user.verificationAttempts || 0) >= otpMaxAttempts) {
      return res.status(429).json({
        message: "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.",
        code: "VERIFICATION_LOCKED",
      });
    }

    const expectedHash = hashVerificationCode(user.email, code, jwtSecret);
    if (!safeTextEqual(user.verificationCodeHash, expectedHash)) {
      user.verificationAttempts = Number(user.verificationAttempts || 0) + 1;
      store.save();
      return res.status(400).json({
        message: `Mã xác minh không đúng. Còn ${Math.max(0, otpMaxAttempts - user.verificationAttempts)} lần thử.`,
        code: "VERIFICATION_INVALID",
      });
    }

    const verifiedAt = new Date().toISOString();
    user.status = "active";
    user.emailVerifiedAt = verifiedAt;
    user.verificationCodeHash = null;
    user.verificationExpiresAt = null;
    user.verificationAttempts = 0;
    user.verificationSentAt = null;
    store.audit("verify", "user", user.id, sanitizeUser(user));
    store.save();
    clearAuthFailures(req.authAttemptKey);

    return res.json({
      message: "Xác minh tài khoản thành công.",
      token: createToken(user, jwtSecret),
      user: sanitizeUser(user),
    });
  });

  app.post("/api/auth/resend-verification", limitEmailDelivery, rateLimitAuth, async (req, res) => {
    const email = normalizeText(req.body.email);
    const user = store.data.users.find((item) => normalizeText(item.email) === email);

    if (!user) {
      return res.json({
        message: "Nếu email hợp lệ, mã xác minh mới đã được gửi.",
        requiresVerification: true,
        email,
      });
    }
    if (user.emailVerifiedAt && user.status === "active") {
      return res.status(409).json({ message: "Tài khoản đã được xác minh." });
    }
    const lastSentAt = new Date(user.verificationSentAt || 0).getTime();
    const remainingSeconds = Math.ceil((otpResendSeconds * 1000 - (Date.now() - lastSentAt)) / 1000);
    if (remainingSeconds > 0) {
      return res.status(429).json({
        message: `Vui lòng chờ ${remainingSeconds} giây trước khi gửi lại mã.`,
        retryAfterSeconds: remainingSeconds,
      });
    }

    const previousVerification = {
      verificationCodeHash: user.verificationCodeHash,
      verificationExpiresAt: user.verificationExpiresAt,
      verificationSentAt: user.verificationSentAt,
      verificationAttempts: user.verificationAttempts,
    };
    const verificationCode = issueVerificationCode(user);
    try {
      await mailer.sendVerification({
        to: user.email,
        name: user.name,
        code: verificationCode,
        purpose: "account",
      });
    } catch (error) {
      Object.assign(user, previousVerification);
      if (!exposeVerificationCode) {
        return res.status(error.code === "EMAIL_NOT_CONFIGURED" ? 503 : 502).json({
          message: "Chưa thể gửi email xác minh. Vui lòng thử lại sau.",
          code: "EMAIL_DELIVERY_UNAVAILABLE",
        });
      }
    }
    store.save();
    return res.json(verificationResponse(
      user,
      verificationCode,
      "Mã xác minh mới đã được gửi tới email của bạn.",
    ));
  });

  app.post("/api/auth/password-reset/request", limitEmailDelivery, rateLimitAuth, async (req, res) => {
    const email = normalizeText(req.body.email);
    const user = store.data.users.find((item) => normalizeText(item.email) === email);
    const response = {
      message: "Nếu email thuộc một tài khoản hợp lệ, mã đặt lại mật khẩu đã được gửi.",
      requiresCode: true,
      email,
      expiresInSeconds: otpTtlSeconds,
    };

    if (!user || user.status === "inactive") return res.json(response);

    const lastSentAt = new Date(user.passwordResetSentAt || 0).getTime();
    const remainingSeconds = Math.ceil((otpResendSeconds * 1000 - (Date.now() - lastSentAt)) / 1000);
    if (remainingSeconds > 0) {
      return res.json(response);
    }

    const previousReset = {
      passwordResetCodeHash: user.passwordResetCodeHash,
      passwordResetExpiresAt: user.passwordResetExpiresAt,
      passwordResetSentAt: user.passwordResetSentAt,
      passwordResetAttempts: user.passwordResetAttempts,
    };
    const code = issuePasswordResetCode(user);
    try {
      await mailer.sendVerification({
        to: user.email,
        name: user.name,
        code,
        purpose: "password-reset",
      });
    } catch (error) {
      Object.assign(user, previousReset);
      if (!exposeVerificationCode) {
        return res.status(error.code === "EMAIL_NOT_CONFIGURED" ? 503 : 502).json({
          message: "Chưa thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.",
          code: "EMAIL_DELIVERY_UNAVAILABLE",
        });
      }
    }
    store.save();
    return res.json({
      ...response,
      ...(exposeVerificationCode ? { resetCode: code } : {}),
    });
  });

  app.post("/api/auth/password-reset/confirm", rateLimitAuth, (req, res) => {
    const email = normalizeText(req.body.email);
    const code = String(req.body.code || "").trim();
    const newPassword = String(req.body.newPassword || "");
    const user = store.data.users.find((item) => normalizeText(item.email) === email);

    if (!user || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Email hoặc mã đặt lại mật khẩu không hợp lệ." });
    }
    const operationsPassword = ["admin", "staff"].includes(user?.role);
    if (!validPassword(newPassword, operationsPassword ? { minLength: 12, requireSpecial: true } : undefined)) {
      return res.status(400).json({
        message: operationsPassword
          ? "Mật khẩu nội bộ cần từ 12 đến 128 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
          : "Mật khẩu mới cần từ 10 đến 128 ký tự, gồm chữ hoa, chữ thường và số.",
      });
    }
    if (!user.passwordResetExpiresAt || new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
      return res.status(410).json({
        message: "Mã đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu mã mới.",
        code: "PASSWORD_RESET_EXPIRED",
      });
    }
    if (Number(user.passwordResetAttempts || 0) >= otpMaxAttempts) {
      return res.status(429).json({
        message: "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.",
        code: "PASSWORD_RESET_LOCKED",
      });
    }

    const expectedHash = hashOneTimeCode("password-reset", user.email, code, jwtSecret);
    if (!safeTextEqual(user.passwordResetCodeHash, expectedHash)) {
      user.passwordResetAttempts = Number(user.passwordResetAttempts || 0) + 1;
      store.save();
      return res.status(400).json({
        message: `Mã đặt lại mật khẩu không đúng. Còn ${Math.max(0, otpMaxAttempts - user.passwordResetAttempts)} lần thử.`,
        code: "PASSWORD_RESET_INVALID",
      });
    }

    user.passwordHash = hashPassword(newPassword);
    user.mustChangePassword = false;
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    user.passwordResetCodeHash = null;
    user.passwordResetExpiresAt = null;
    user.passwordResetSentAt = null;
    user.passwordResetAttempts = 0;
    store.audit("reset_password", "user", user.id, sanitizeUser(user));
    store.save();
    clearAuthFailures(req.authAttemptKey);
    return res.json({ message: "Mật khẩu đã được đặt lại. Bạn có thể đăng nhập ngay." });
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: process.env.APP_NAME || "novawear-commerce-backend",
      version: store.data.meta?.version || 1,
      storage: store.pool ? "postgres" : "json",
      emailConfigured: Boolean(mailer.configured),
      cloudinaryConfigured: Boolean(cloudinaryService.configured),
      sepayConfigured,
      time: new Date().toISOString(),
    });
  });

  // Readiness is intentionally separate from the lightweight liveness check
  // above. Render/load balancers can use this endpoint to stop routing traffic
  // when the database is unavailable, while the public health endpoint remains
  // useful for basic monitoring.
  app.get("/api/health/ready", async (_req, res) => {
    const checks = {
      database: "ok",
      storage: store.pool ? "postgres" : "json",
      email: mailer.configured ? "configured" : "not_configured",
      cloudinary: cloudinaryService.configured ? "configured" : "not_configured",
      sepay: sepayConfigured ? "configured" : "not_configured",
    };
    if (store.pool?.query) {
      try {
        await store.pool.query("SELECT 1");
      } catch (_error) {
        checks.database = "unavailable";
      }
    }
    const production = process.env.NODE_ENV === "production";
    const ready = checks.database === "ok" && (!production || checks.storage === "postgres");
    return res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      checks,
      time: new Date().toISOString(),
    });
  });

  app.get("/api/config", (_req, res) => {
    res.json({
      brand: store.data.meta?.brand || "NOVAWEAR",
      currency: "VND",
      freeShippingThreshold: 699000,
      support: {
        phone: "1900 0000",
        email: "hello@novawear.vn",
        hours: "08:00 - 21:00, Thứ 2 - Chủ nhật",
      },
      integrations: {
        email: Boolean(mailer.configured),
        uploads: Boolean(cloudinaryService.configured),
        oauth: oauthService.publicConfig(),
        sepay: sepayConfigured,
      },
    });
  });

  app.post("/api/auth/register", limitEmailDelivery, rateLimitAuth, registerHandler);
  app.post("/api/auth/login", rateLimitAuth, loginHandler);
  app.post("/api/createaccount", limitEmailDelivery, rateLimitAuth, registerHandler);
  app.post("/api/login", rateLimitAuth, loginHandler);

  app.get("/api/auth/oauth/config", (_req, res) => {
    return res.json({ data: oauthService.publicConfig() });
  });

  app.get("/api/auth/oauth/:provider/start", limitOAuthStart, rateLimitAuth, (req, res) => {
    const provider = String(req.params.provider || "").toLowerCase();
    if (!oauthService.isConfigured(provider)) {
      return res.status(503).json({ message: "Phương thức đăng nhập này chưa được cấu hình." });
    }
    const state = crypto.randomBytes(32).toString("base64url");
    const verifier = provider === "google" ? oauthService.createVerifier() : "";
    oauthStates.set(temporaryKey(state), {
      provider,
      verifier,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return res.redirect(oauthService.authorizationUrl(
      provider,
      state,
      verifier ? oauthService.createChallenge(verifier) : "",
    ));
  });

  async function oauthCallback(req, res) {
    const provider = String(req.params.provider || "").toLowerCase();
    const successUrl = String(process.env.OAUTH_SUCCESS_URL || "http://localhost:3000/oauth/callback");
    const failureUrl = String(process.env.OAUTH_FAILURE_URL || "http://localhost:3000/dang-nhap");
    const fail = (code) => {
      const url = new URL(failureUrl);
      url.searchParams.set("oauthError", code);
      return res.redirect(url.toString());
    };
    const state = String(req.query.state || "");
    const stateKey = temporaryKey(state);
    const pending = oauthStates.get(stateKey);
    oauthStates.delete(stateKey);
    if (!state || !pending || pending.provider !== provider || pending.expiresAt < Date.now()) {
      return fail("invalid_state");
    }
    if (req.query.error || !req.query.code) return fail("authorization_cancelled");
    try {
      const profile = await oauthService.exchange(provider, String(req.query.code), pending.verifier);
      const profileEmail = normalizeText(profile.email);
      const profileId = String(profile.providerId || "").trim();
      if (!profileId || !emailPattern.test(profileEmail)) return fail("provider_profile_invalid");

      let user = store.data.users.find((item) => normalizeText(item.email) === profileEmail);
      if (user && user.role !== "customer") return fail("employee_account_not_supported");

      const providerField = provider === "google" ? "googleId" : "facebookId";
      if (user?.[providerField] && user[providerField] !== profileId) {
        return fail("provider_account_mismatch");
      }
      if (user?.status === "inactive") return fail("account_locked");

      const providerVerifiedEmail = profile.emailVerified === true;
      if (user && !providerVerifiedEmail && !user[providerField]) {
        // Never attach an OAuth identity to an existing local account using
        // an email address the provider did not explicitly verify.
        return fail("provider_email_not_verified");
      }

      const now = new Date().toISOString();
      if (!user) {
        const customerId = store.nextId("customers", "cus-");
        user = {
          id: store.nextId("users", "usr-"),
          name: String(profile.name || profileEmail.split("@")[0]).trim().slice(0, 100),
          email: profileEmail,
          phone: "",
          avatar: String(profile.avatar || "").slice(0, 1000),
          role: "customer",
          customerId,
          employeeId: null,
          status: providerVerifiedEmail ? "active" : "pending",
          emailVerifiedAt: providerVerifiedEmail ? now : null,
          tokenVersion: 0,
          passwordHash: hashPassword(crypto.randomBytes(48).toString("base64url")),
          [providerField]: profileId,
          createdAt: now,
        };
        const customer = {
          id: customerId,
          name: user.name,
          email: profileEmail,
          phone: "",
          avatar: user.avatar,
          address: "",
          tier: "Member",
          totalSpent: 0,
          orderCount: 0,
          status: "active",
          createdAt: now,
        };
        if (!providerVerifiedEmail) {
          const verificationCode = issueVerificationCode(user);
          try {
            await mailer.sendVerification({
              to: user.email,
              name: user.name,
              code: verificationCode,
              purpose: "account",
            });
          } catch (error) {
            if (!exposeVerificationCode) return fail("email_delivery_unavailable");
          }
        }
        store.data.customers.push(customer);
        store.data.users.push(user);
        store.audit("create", "user", user.id, sanitizeUser(user));
      } else {
        user[providerField] = profileId;
        user.avatar = user.avatar || String(profile.avatar || "").slice(0, 1000);
        if (providerVerifiedEmail) {
          user.emailVerifiedAt = user.emailVerifiedAt || now;
          user.status = "active";
        } else if (!user.emailVerifiedAt) {
          const lastSentAt = new Date(user.verificationSentAt || 0).getTime();
          if (Date.now() - lastSentAt >= otpResendSeconds * 1000) {
            const previousVerification = {
              verificationCodeHash: user.verificationCodeHash,
              verificationExpiresAt: user.verificationExpiresAt,
              verificationSentAt: user.verificationSentAt,
              verificationAttempts: user.verificationAttempts,
            };
            const verificationCode = issueVerificationCode(user);
            try {
              await mailer.sendVerification({
                to: user.email,
                name: user.name,
                code: verificationCode,
                purpose: "account",
              });
            } catch (error) {
              Object.assign(user, previousVerification);
              if (!exposeVerificationCode) return fail("email_delivery_unavailable");
            }
          }
        }
      }

      if (!user.emailVerifiedAt || user.status !== "active") {
        store.audit("oauth_verification_required", "user", user.id, { id: user.id, name: provider });
        store.save();
        const redirect = new URL(failureUrl);
        redirect.searchParams.set("verifyEmail", user.email);
        redirect.searchParams.set("oauthPending", "1");
        return res.redirect(redirect.toString());
      }

      store.audit("oauth_login", "user", user.id, { id: user.id, name: provider });
      store.save();

      const exchangeCode = crypto.randomBytes(32).toString("base64url");
      oauthExchanges.set(temporaryKey(exchangeCode), {
        userId: user.id,
        expiresAt: Date.now() + 60 * 1000,
      });
      const redirect = new URL(successUrl);
      redirect.searchParams.set("code", exchangeCode);
      return res.redirect(redirect.toString());
    } catch (error) {
      return fail(error.code || "provider_error");
    }
  }

  app.get("/api/auth/google/callback", rateLimitAuth, (req, res) => {
    req.params.provider = "google";
    return oauthCallback(req, res);
  });
  app.get("/api/auth/facebook/callback", rateLimitAuth, (req, res) => {
    req.params.provider = "facebook";
    return oauthCallback(req, res);
  });

  app.post("/api/auth/oauth/exchange", rateLimitAuth, (req, res) => {
    const code = String(req.body.code || "").trim();
    const key = temporaryKey(code);
    const pending = oauthExchanges.get(key);
    oauthExchanges.delete(key);
    if (!code || !pending || pending.expiresAt < Date.now()) {
      recordAuthFailure(req.authAttemptKey);
      return res.status(401).json({ message: "Mã đăng nhập đã hết hạn hoặc đã được sử dụng." });
    }
    const user = store.data.users.find((item) => item.id === pending.userId);
    if (!user || user.role !== "customer" || user.status !== "active" || !user.emailVerifiedAt) {
      return res.status(403).json({ message: "Tài khoản không thể đăng nhập bằng phương thức này." });
    }
    clearAuthFailures(req.authAttemptKey);
    return res.json({
      message: "Đăng nhập thành công.",
      token: createToken(user, jwtSecret),
      user: sanitizeUser(user),
    });
  });

  app.post("/api/auth/operations-exchange", rateLimitAuth, (req, res) => {
    const code = String(req.body.code || "").trim();
    const key = temporaryKey(code);
    const handoff = operationsHandoffs.get(key);
    operationsHandoffs.delete(key);
    if (!code || !handoff || handoff.expiresAt < Date.now()) {
      recordAuthFailure(req.authAttemptKey);
      return res.status(401).json({
        message: "Liên kết đăng nhập quản trị không hợp lệ hoặc đã hết hạn.",
        code: "HANDOFF_INVALID",
      });
    }
    const user = store.data.users.find((item) => item.id === handoff.userId);
    if (!user || !["admin", "staff"].includes(user.role)
      || user.status !== "active" || !user.emailVerifiedAt) {
      return res.status(403).json({ message: "Tài khoản không có quyền truy cập khu vực vận hành." });
    }
    clearAuthFailures(req.authAttemptKey);
    return res.json({
      message: "Đã xác nhận phiên đăng nhập quản trị.",
      token: createToken(user, jwtSecret),
      user: sanitizeUser(user),
    });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = store.data.users.find((item) => item.id === req.user.id);
    const customer = user.customerId
      ? store.data.customers.find((item) => item.id === user.customerId)
      : null;
    const employee = user.employeeId
      ? store.data.employees.find((item) => item.id === user.employeeId)
      : null;
    res.json({
      user: sanitizeUser(user),
      customer,
      employee,
      membership: customer ? membershipProfile(customer.totalSpent) : null,
    });
  });

  app.get("/api/membership/tiers", (_req, res) => {
    return res.json({
      data: MEMBERSHIP_TIERS.map((item) => ({ ...item })),
    });
  });

  app.put("/api/auth/me", requireAuth, (req, res) => {
    const user = store.data.users.find((item) => item.id === req.user.id);
    const name = String(req.body.name || user.name).trim();
    const phone = String(req.body.phone || user.phone).trim();
    const addressProvided = req.body.address !== undefined;
    const address = addressProvided ? String(req.body.address || "").trim() : null;

    if (name.length < 2) return res.status(400).json({ message: "Họ tên chưa hợp lệ." });
    if (!phonePattern.test(phone)) return res.status(400).json({ message: "Số điện thoại chưa hợp lệ." });

    const customer = user.customerId
      ? store.data.customers.find((item) => item.id === user.customerId)
      : null;
    const employee = user.employeeId
      ? store.data.employees.find((item) => item.id === user.employeeId)
      : null;
    const addressChanged = Boolean(customer && addressProvided
      && normalizeText(address) !== normalizeText(customer.address));
    if (addressChanged && address) {
      const confirmation = req.body.addressConfirmation;
      if (!confirmation?.confirmed
        || normalizeText(confirmation.address) !== normalizeText(address)) {
        return res.status(400).json({
          message: "Vui lòng kiểm tra địa chỉ mới trước khi lưu vào hồ sơ.",
          code: "PROFILE_ADDRESS_CONFIRMATION_REQUIRED",
        });
      }
    }

    user.name = name;
    user.phone = phone;
    if (customer) {
      if (addressChanged && address) {
        customer.addressVerifiedAt = new Date().toISOString();
        customer.addressVerificationMethod = "customer_map_review";
      } else if (addressChanged) {
        customer.addressVerifiedAt = null;
        customer.addressVerificationMethod = null;
      }
      Object.assign(customer, { name, phone });
      if (addressProvided) customer.address = address;
    }
    if (employee) {
      Object.assign(employee, { name, phone });
      if (addressProvided) employee.address = address;
    }
    if (user.role === "customer") {
      mergeChatConversationsForUser(store, user);
    }
    store.audit("update", "user", user.id, req.user);
    store.save();
    return res.json({
      message: "Đã cập nhật hồ sơ.",
      user: sanitizeUser(user),
      customer,
      employee,
    });
  });

  app.put("/api/auth/password", requireAuth, (req, res) => {
    const user = store.data.users.find((item) => item.id === req.user.id);
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng." });
    }
    const operationsPassword = ["admin", "staff"].includes(user.role);
    if (!validPassword(newPassword, operationsPassword ? { minLength: 12, requireSpecial: true } : undefined)) {
      return res.status(400).json({
        message: operationsPassword
          ? "Mật khẩu nội bộ cần từ 12 đến 128 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
          : "Mật khẩu mới cần từ 10 đến 128 ký tự, gồm chữ hoa, chữ thường và số.",
      });
    }
    user.passwordHash = hashPassword(newPassword);
    user.mustChangePassword = false;
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    store.audit("update_password", "user", user.id, req.user);
    store.save();
    return res.json({
      message: "Đổi mật khẩu thành công.",
      token: createToken(user, jwtSecret),
      user: sanitizeUser(user),
    });
  });

  app.post("/api/auth/logout", requireAuth, (req, res) => {
    const user = store.data.users.find((item) => item.id === req.user.id);
    if (user) {
      user.tokenVersion = Number(user.tokenVersion || 0) + 1;
      store.audit("logout", "user", user.id, req.user);
      store.save();
    }
    return res.json({ message: "Đã đăng xuất an toàn trên máy chủ." });
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: asPositiveInt(process.env.UPLOAD_MAX_FILE_SIZE_MB, 12) * 1024 * 1024 },
    fileFilter(_req, file, callback) {
      if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) {
        callback(new Error("Chỉ chấp nhận ảnh JPEG, PNG, WebP, GIF hoặc AVIF."));
        return;
      }
      callback(null, true);
    },
  });
  const uploadFolders = {
    product: process.env.CLOUDINARY_PRODUCT_FOLDER || "novawear/products",
    avatar: process.env.CLOUDINARY_AVATAR_FOLDER || "novawear/avatars",
    review: process.env.CLOUDINARY_REVIEW_FOLDER || "novawear/reviews",
    return: process.env.CLOUDINARY_RETURN_FOLDER || "novawear/returns",
  };

  app.post("/api/uploads/:kind", requireAuth, (req, res) => {
    const kind = String(req.params.kind || "");
    if (!Object.hasOwn(uploadFolders, kind)) return notFound(res, "Loại ảnh");
    if (req.user.mustChangePassword) {
      return res.status(403).json({
        message: "Bạn cần đổi mật khẩu tạm trước khi tải ảnh.",
        code: "PASSWORD_CHANGE_REQUIRED",
      });
    }
    if (kind === "product" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền tải ảnh sản phẩm." });
    }
    if (kind !== "product" && req.user.role !== "customer") {
      return res.status(403).json({ message: "Loại tài khoản không phù hợp với ảnh này." });
    }
    const limitUpload = kind === "product" ? limitProductUploads : limitCustomerUploads;
    return limitUpload(req, res, () => upload.single("file")(req, res, async (uploadError) => {
      if (uploadError) {
        return res.status(400).json({ message: uploadError.message || "Ảnh tải lên không hợp lệ." });
      }
      if (!req.file) return res.status(400).json({ message: "Vui lòng chọn một tệp ảnh." });
      try {
        const data = await cloudinaryService.uploadImage(req.file.buffer, uploadFolders[kind]);
        const productMinEdge = asNonNegativeInt(process.env.UPLOAD_PRODUCT_MIN_EDGE_PX, 0);
        if (kind === "product" && productMinEdge > 0 && (
          Number(data.width || 0) < productMinEdge
          || Number(data.height || 0) < productMinEdge
        )) {
          try {
            if (cloudinaryService.deleteImage) await cloudinaryService.deleteImage(data.publicId);
          } catch (_cleanupError) {
            // The response must still reject the undersized asset even when
            // Cloudinary cleanup is temporarily unavailable.
          }
          return res.status(422).json({
            message: `Ảnh sản phẩm quá nhỏ (${data.width || 0}×${data.height || 0}px). Mỗi cạnh cần tối thiểu ${productMinEdge}px để hiển thị sắc nét.`,
            code: "PRODUCT_IMAGE_TOO_SMALL",
            minimumEdge: productMinEdge,
          });
        }
        if (kind === "avatar") {
          const user = store.data.users.find((item) => item.id === req.user.id);
          user.avatar = data.url;
          const customer = store.data.customers.find((item) => item.id === user.customerId);
          if (customer) customer.avatar = data.url;
          store.audit("upload_avatar", "user", user.id, req.user);
          store.save();
        }
        return res.status(201).json({
          message: `Tải ảnh ${data.width || ""}×${data.height || ""}px lên thành công, ảnh gốc được giữ nguyên chất lượng.`,
          data,
        });
      } catch (error) {
        return res.status(error.code === "CLOUDINARY_NOT_CONFIGURED" ? 503 : 502).json({
          message: error.code === "CLOUDINARY_NOT_CONFIGURED"
            ? error.message
            : "Cloudinary chưa thể xử lý ảnh. Vui lòng thử lại.",
        });
      }
    }));
  });

  app.get("/api/categories", (_req, res) => {
    cachePublicResponse(res, 120, 600);
    const categories = store.data.categories
      .filter((item) => !item.status || item.status === "active")
      .map((item) => {
        const activeProducts = store.data.products.filter(
          (product) => product.categoryId === item.id && product.status === "active",
        );
        return {
          ...item,
          productCount: activeProducts.length,
          audienceCounts: {
            men: activeProducts.filter((product) => ["men", "unisex"].includes(normalizeText(product.audience))).length,
            women: activeProducts.filter((product) => ["women", "unisex"].includes(normalizeText(product.audience))).length,
          },
        };
      });
    res.json({ data: categories });
  });

  app.get("/api/products", (req, res) => {
    const {
      search = "",
      category = "",
      minPrice,
      maxPrice,
      audience = "",
      color = "",
      size = "",
      inStock,
      sale,
      sort = "featured",
      featured,
    } = req.query;
    const page = asPositiveInt(req.query.page, 1);
    const limit = Math.min(asPositiveInt(req.query.limit || req.query.pageSize, 12), 100);
    const cardView = normalizeText(req.query.view) === "card";
    const searchText = normalizeText(search || req.query.keyword);
    const categoryText = normalizeText(category);
    const audienceText = normalizeText(audience);
    const colorText = normalizeText(color);
    const sizeText = normalizeText(size);
    const sales = orderSalesByProduct(store.data.orders);
    let products = store.data.products
      .filter((item) => item.status === "active")
      .map((item) => ({
      ...item,
      sold: sales.get(item.id) || 0,
      ...ratingStats(item.id, store.data.reviews),
    }));

    if (featured === "true") products = products.filter((item) => item.featured);
    if (searchText) {
      products = products.filter((item) => (
        normalizeText(`${item.name} ${item.sku} ${item.description}`).includes(searchText)
      ));
    }
    if (categoryText) {
      const categoryItem = store.data.categories.find((item) => (
        normalizeText(item.id) === categoryText || normalizeText(item.slug) === categoryText
      ));
      products = categoryItem ? products.filter((item) => item.categoryId === categoryItem.id) : [];
    }
    if (minPrice !== undefined) products = products.filter((item) => item.price >= asMoney(minPrice));
    if (maxPrice !== undefined) products = products.filter((item) => item.price <= asMoney(maxPrice));
    if (audienceText && audienceText !== "all") {
      products = products.filter((item) => [audienceText, "unisex"].includes(normalizeText(item.audience)));
    }
    if (colorText) products = products.filter((item) => (item.colors || []).some((value) => normalizeText(value) === colorText));
    if (sizeText) products = products.filter((item) => (item.sizes || []).some((value) => normalizeText(value) === sizeText));
    if (inStock === "true") products = products.filter((item) => Number(item.stock) > 0);
    if (sale === "true") products = products.filter((item) => Number(item.comparePrice) > Number(item.price) && (!item.saleEndsAt || new Date(item.saleEndsAt) > new Date()));

    const discountRate = (item) => {
      const price = Number(item.price);
      const comparePrice = Number(item.comparePrice);
      return comparePrice > price && comparePrice > 0 ? (comparePrice - price) / comparePrice : 0;
    };
    const sorters = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      "discount-desc": (a, b) => discountRate(b) - discountRate(a),
      popular: (a, b) => b.sold - a.sold,
      rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount || b.sold - a.sold,
      featured: (a, b) => Number(b.featured) - Number(a.featured) || b.sold - a.sold,
    };
    products.sort(sorters[sort] || sorters.featured);

    const total = products.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const data = products
      .slice(start, start + limit)
      .map((item) => (
        cardView
          ? publicProductCard(item, store.data.categories)
          : publicProduct(item, store.data.categories)
      ));

    cachePublicResponse(res);
    res.json({
      data,
      pagination: { page: safePage, limit, total, totalPages },
    });
  });

  app.get("/api/products/:identifier", (req, res) => {
    const product = store.data.products.find(
      (item) => item.id === req.params.identifier || item.slug === req.params.identifier,
    );
    if (!product || product.status !== "active") return notFound(res, "Sản phẩm");
    const sales = orderSalesByProduct(store.data.orders);
    const productWithRating = { ...product, sold: sales.get(product.id) || 0, ...ratingStats(product.id, store.data.reviews) };
    const related = store.data.products
      .filter((item) => item.id !== product.id && item.categoryId === product.categoryId && item.status === "active")
      .slice(0, 4)
      .map((item) => publicProductCard({ ...item, sold: sales.get(item.id) || 0, ...ratingStats(item.id, store.data.reviews) }, store.data.categories));
    const reviews = store.data.reviews
      .filter((item) => item.productId === product.id && item.status === "published")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    cachePublicResponse(res, 30, 120);
    return res.json({
      data: publicProduct(productWithRating, store.data.categories),
      related,
      reviews,
    });
  });

  app.post("/api/products/:productId/reviews", requireAuth, allowRoles("customer"), (req, res) => {
    const product = store.data.products.find((item) => item.id === req.params.productId);
    if (!product) return notFound(res, "Sản phẩm");
    const rating = Number(req.body.rating);
    const content = String(req.body.content || "").trim();
    const images = Array.isArray(req.body.images)
      ? req.body.images.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3)
      : [];
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Điểm đánh giá phải từ 1 đến 5." });
    }
    if (content.length < 10 || content.length > 500) {
      return res.status(400).json({ message: "Nội dung đánh giá cần từ 10 đến 500 ký tự." });
    }
    if (store.data.reviews.some((item) => item.productId === product.id && item.userId === req.user.id)) {
      return res.status(409).json({ message: "Bạn đã đánh giá sản phẩm này." });
    }
    const canReview = store.data.orders.some((order) => (
      order.customerId === req.user.customerId
      && order.status === "delivered"
      && order.items.some((item) => item.productId === product.id)
    ));
    if (!canReview) {
      return res.status(403).json({ message: "Bạn chỉ có thể đánh giá sau khi đơn chứa sản phẩm này đã giao thành công." });
    }
    const review = {
      id: store.nextId("reviews", "rev-"),
      productId: product.id,
      userId: req.user.id,
      name: req.user.name,
      rating,
      content,
      images,
      status: "published",
      createdAt: new Date().toISOString(),
    };
    store.data.reviews.push(review);
    const published = store.data.reviews.filter((item) => item.productId === product.id && item.status === "published");
    product.rating = Math.round((published.reduce((sum, item) => sum + item.rating, 0) / published.length) * 10) / 10;
    product.reviewCount = published.length;
    store.audit("create", "review", review.id, req.user);
    store.save();
    return res.status(201).json({ message: "Cảm ơn bạn đã đánh giá.", data: review });
  });

  app.get("/api/products/:productId/review-eligibility", requireAuth, allowRoles("customer"), (req, res) => {
    const product = store.data.products.find((item) => item.id === req.params.productId);
    if (!product) return notFound(res, "Sản phẩm");
    const reviewed = store.data.reviews.some((item) => item.productId === product.id && item.userId === req.user.id);
    const delivered = store.data.orders.some((order) => (
      order.customerId === req.user.customerId
      && order.status === "delivered"
      && order.items.some((item) => item.productId === product.id)
    ));
    return res.json({ data: { eligible: delivered && !reviewed, delivered, reviewed } });
  });

  app.get("/api/promotions", (_req, res) => {
    cachePublicResponse(res, 30, 120);
    const now = new Date();
    const data = (store.data.coupons || [])
      .filter((item) => !couponAvailabilityError(item, null, now))
      .map(({ code, type, value, minOrder, maxDiscount, startsAt, expiresAt, usageLimit, usedCount }) => ({
        code,
        type,
        value,
        minOrder,
        maxDiscount,
        startsAt,
        expiresAt,
        remainingUses: Number(usageLimit || 0) > 0
          ? Math.max(0, Number(usageLimit) - Number(usedCount || 0))
          : null,
      }));
    return res.json({ data });
  });

  app.get("/api/promotions/catalog-summary", (_req, res) => {
    cachePublicResponse(res, 30, 120);
    const now = new Date();
    const categoryById = new Map(
      (store.data.categories || [])
        .filter((item) => !item.status || item.status === "active")
        .map((item) => [item.id, item]),
    );
    const groups = new Map();

    (store.data.products || [])
      .filter((item) => (
        item.status === "active"
        && Number(item.comparePrice) > Number(item.price)
        && (!item.saleEndsAt || new Date(item.saleEndsAt) > now)
      ))
      .forEach((product) => {
        const category = categoryById.get(product.categoryId);
        if (!category) return;
        const discountPercent = Math.round(
          ((Number(product.comparePrice) - Number(product.price)) / Number(product.comparePrice)) * 100,
        );
        const current = groups.get(category.id) || {
          id: category.id,
          name: category.name,
          slug: category.slug,
          audience: category.audience || "all",
          productCount: 0,
          minDiscountPercent: discountPercent,
          maxDiscountPercent: discountPercent,
          totalDiscountPercent: 0,
          images: [],
        };
        current.productCount += 1;
        current.minDiscountPercent = Math.min(current.minDiscountPercent, discountPercent);
        current.maxDiscountPercent = Math.max(current.maxDiscountPercent, discountPercent);
        current.totalDiscountPercent += discountPercent;
        if (product.image && !current.images.includes(product.image) && current.images.length < 2) {
          current.images.push(product.image);
        }
        groups.set(category.id, current);
      });

    const categories = [...groups.values()]
      .map(({ totalDiscountPercent, ...item }) => ({
        ...item,
        averageDiscountPercent: Math.round(totalDiscountPercent / item.productCount),
      }))
      .sort((left, right) => (
        right.productCount - left.productCount
        || right.averageDiscountPercent - left.averageDiscountPercent
        || right.maxDiscountPercent - left.maxDiscountPercent
        || String(left.name).localeCompare(String(right.name), "vi")
      ));

    return res.json({
      data: {
        totalSaleProducts: categories.reduce((total, item) => total + item.productCount, 0),
        categoryCount: categories.length,
        featuredCategory: categories[0] || null,
        categories,
      },
    });
  });

  app.get("/api/news", (_req, res) => {
    cachePublicResponse(res, 120, 600);
    const data = (store.data.news || []).filter((item) => item.status === "published").sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return res.json({ data });
  });
  app.get("/api/news/:id", (req, res) => {
    const article = (store.data.news || []).find((item) => item.id === req.params.id && item.status === "published");
    if (!article) return notFound(res, "Bài viết");
    const published = (store.data.news || []).filter((item) => item.status === "published").sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    cachePublicResponse(res, 120, 600);
    return res.json({ data: article, related: published.filter((item) => item.id !== article.id).slice(0, 3) });
  });

  app.post("/api/coupons/validate", limitPublicForms, (req, res) => {
    const code = String(req.body.code || "").trim().toUpperCase();
    const subtotal = asMoney(req.body.subtotal);
    const coupon = store.data.coupons.find((item) => item.code === code);
    const availabilityError = couponAvailabilityError(coupon, subtotal);
    if (availabilityError) {
      return res.status(availabilityError.status).json({
        message: availabilityError.message,
        code: availabilityError.code,
      });
    }
    const benefit = couponBenefit(coupon, subtotal, 0);
    return res.json({
      data: {
        code: coupon.code,
        type: coupon.type,
        discount: benefit.discount,
        shippingDiscount: coupon.type === "shipping" ? asMoney(coupon.value) : 0,
      },
    });
  });

  app.post("/api/payments/sepay/webhook", (req, res) => {
    if (!validSepayWebhookKey) {
      return res.status(503).json({ success: false, message: "SePay webhook is not configured." });
    }

    const authorization = String(req.get("authorization") || "").trim();
    if (!safeTextEqual(authorization, `Apikey ${sepayWebhookApiKey}`)) {
      return res.status(401).json({ success: false, message: "Webhook authentication failed." });
    }

    const transactionId = String(req.body.id || "").trim();
    const transferAmount = asMoney(req.body.transferAmount);
    const transferType = String(req.body.transferType || "").toLowerCase();
    if (!transactionId || transferType !== "in" || transferAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid SePay transaction payload." });
    }

    store.data.paymentTransactions = store.data.paymentTransactions || [];
    const duplicate = store.data.paymentTransactions.find((item) => String(item.id) === transactionId);
    if (duplicate) {
      return res.status(200).json({ success: true, duplicate: true, orderId: duplicate.orderId || null });
    }

    const searchableCode = normalizePaymentCode(`${req.body.code || ""} ${req.body.content || ""} ${req.body.description || ""}`);
    const order = store.data.orders.find((item) => {
      if (item.paymentProvider !== "sepay" || item.paymentStatus !== "awaiting" || item.status !== "pending") return false;
      if (asMoney(item.total) !== transferAmount) return false;
      const candidates = [item.paymentCode, item.trackingCode, item.id]
        .map(normalizePaymentCode)
        .filter(Boolean);
      return candidates.some((candidate) => searchableCode.includes(candidate));
    });

    const receivedAt = new Date().toISOString();
    const transaction = {
      id: transactionId,
      orderId: order?.id || null,
      gateway: String(req.body.gateway || ""),
      accountNumber: String(req.body.accountNumber || ""),
      referenceCode: String(req.body.referenceCode || ""),
      transferAmount,
      code: String(req.body.code || ""),
      content: String(req.body.content || "").slice(0, 500),
      receivedAt,
    };
    store.data.paymentTransactions.unshift(transaction);
    store.data.paymentTransactions = store.data.paymentTransactions.slice(0, 1000);

    if (order) {
      const event = applyOrderPaymentPaid(store, order, {
        transaction,
        at: receivedAt,
        actor: { name: "SePay", role: "payment_provider" },
        source: "sepay",
        label: "Đã thanh toán qua SePay",
      });
      store.audit("payment_confirmed", "order", order.id, { name: "SePay" });
      if (event) queueOrderStatusEmail(order, event);
    } else {
      store.audit("payment_unmatched", "payment", transactionId, { name: "SePay" });
    }
    store.save();

    return res.status(200).json({ success: true, matched: Boolean(order), orderId: order?.id || null });
  });

  app.get("/api/payments/sepay/orders/:id/status", limitOrderTracking, async (req, res) => {
    expireAwaitingPaymentOrders();
    const order = store.data.orders.find((item) => item.id === req.params.id);
    const trackingCode = normalizePaymentCode(req.query.trackingCode);
    if (!order || !trackingCode || trackingCode !== normalizePaymentCode(order.trackingCode)) {
      return notFound(res, "Payment");
    }
    if (sepayApiConfigured
      && order.paymentProvider === "sepay"
      && order.paymentStatus === "awaiting"
      && order.status === "pending") {
      const now = Date.now();
      const lastCheckedAt = Number(order.sepayLastCheckedAt || 0);
      if (now - lastCheckedAt >= 2500) {
        order.sepayLastCheckedAt = now;
        try {
          const lookup = typeof sepayTransactionLookup === "function"
            ? sepayTransactionLookup
            : sepayTransactionLookup.findIncomingPayment.bind(sepayTransactionLookup);
          const transaction = await lookup({
            reference: order.paymentCode || order.trackingCode,
            amount: order.total,
            accountNumber: sepayQr.accountNumber,
            createdAt: order.createdAt,
          });
          if (transaction) {
            const duplicate = store.data.paymentTransactions.find(
              (item) => String(item.id) === String(transaction.id),
            );
            if (!duplicate) {
              const receivedAt = transaction.receivedAt || new Date().toISOString();
              const savedTransaction = {
                id: String(transaction.id),
                orderId: order.id,
                gateway: String(transaction.gateway || ""),
                accountNumber: String(transaction.accountNumber || sepayQr.accountNumber),
                referenceCode: String(transaction.referenceCode || ""),
                transferAmount: asMoney(transaction.transferAmount),
                code: String(transaction.code || ""),
                content: String(transaction.content || "").slice(0, 500),
                receivedAt,
                source: "sepay-api",
              };
              store.data.paymentTransactions.unshift(savedTransaction);
              store.data.paymentTransactions = store.data.paymentTransactions.slice(0, 1000);
              const event = applyOrderPaymentPaid(store, order, {
                transaction: savedTransaction,
                at: receivedAt,
                actor: { name: "SePay API", role: "payment_provider" },
                source: "sepay",
                label: "Đã thanh toán qua SePay",
              });
              store.audit("payment_confirmed", "order", order.id, { name: "SePay API" });
              store.save();
              if (event) queueOrderStatusEmail(order, event);
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV !== "test") {
            console.warn(`SePay polling failed for order ${order.id}: ${error.message}`);
          }
        }
      }
    }
    return res.json({
      data: {
        orderId: order.id,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        paidAt: order.paidAt || null,
      },
    });
  });

  app.get("/api/payments/sepay/orders/:id/checkout", limitOrderTracking, (req, res) => {
    expireAwaitingPaymentOrders();
    if (!sepayConfigured) {
      return res.status(503).json({ message: "Thanh toán chuyển khoản chưa được cấu hình." });
    }
    const order = store.data.orders.find((item) => item.id === req.params.id);
    const trackingCode = normalizePaymentCode(req.query.trackingCode);
    if (!order || order.paymentProvider !== "sepay"
      || !trackingCode || trackingCode !== normalizePaymentCode(order.trackingCode)) {
      return notFound(res, "Payment");
    }
    if (!["awaiting", "paid"].includes(order.paymentStatus)) {
      return res.status(409).json({ message: "Đơn hàng không còn trong thời gian chờ thanh toán." });
    }
    const description = normalizePaymentCode(order.paymentCode || order.trackingCode);
    const query = new URLSearchParams({
      acc: sepayQr.accountNumber,
      bank: sepayQr.bankCode,
      amount: String(asMoney(order.total)),
      des: description,
      template: sepayQr.template,
    });
    return res.json({
      data: {
        orderId: order.id,
        amount: asMoney(order.total),
        description,
        bankCode: sepayQr.bankCode,
        accountNumber: sepayQr.accountNumber,
        accountName: sepayQr.accountName || null,
        qrUrl: `https://qr.sepay.vn/img?${query.toString()}`,
      },
    });
  });

  app.post("/api/checkout/verification/request", limitEmailDelivery, rateLimitAuth, async (req, res) => {
    const email = normalizeText(req.body.email);
    const name = String(req.body.name || "Khách hàng").trim().slice(0, 100);
    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "Email chưa đúng định dạng." });
    }
    const requestWindow = checkoutRequestWindowSeconds * 1000;
    const requestKey = String(req.ip || "unknown");
    const recentRequests = (checkoutRequestLimits.get(requestKey) || [])
      .filter((timestamp) => Date.now() - timestamp < requestWindow);
    if (recentRequests.length >= checkoutMaxCodeRequests) {
      return res.status(429).json({
        message: "Đã gửi quá nhiều mã từ kết nối này. Vui lòng thử lại sau 15 phút.",
      });
    }
    const account = store.data.users.find((item) => normalizeText(item.email) === email);
    if (account) {
      return res.status(409).json({
        message: account.emailVerifiedAt
          ? "Email này đã có tài khoản. Vui lòng đăng nhập để đặt hàng an toàn."
          : "Email này đang chờ xác minh tài khoản. Vui lòng hoàn tất xác minh trước.",
        code: account.emailVerifiedAt ? "ACCOUNT_LOGIN_REQUIRED" : "ACCOUNT_VERIFICATION_REQUIRED",
      });
    }
    const key = temporaryKey(email);
    const current = guestVerificationAttempts.get(key);
    const now = Date.now();
    if (current?.sentAt && now - current.sentAt < otpResendSeconds * 1000) {
      const retryAfterSeconds = Math.ceil((otpResendSeconds * 1000 - (now - current.sentAt)) / 1000);
      return res.status(429).json({
        message: `Vui lòng chờ ${retryAfterSeconds} giây trước khi gửi lại mã.`,
        retryAfterSeconds,
      });
    }

    const code = createVerificationCode();
    const record = {
      codeHash: hashVerificationCode(email, code, jwtSecret),
      expiresAt: now + otpTtlSeconds * 1000,
      sentAt: now,
      attempts: 0,
    };
    try {
      await mailer.sendVerification({ to: email, name, code, purpose: "checkout" });
    } catch (error) {
      if (!exposeVerificationCode) {
        return res.status(error.code === "EMAIL_NOT_CONFIGURED" ? 503 : 502).json({
          message: "Chưa thể gửi email xác minh đơn hàng. Vui lòng thử lại sau.",
          code: "EMAIL_DELIVERY_UNAVAILABLE",
        });
      }
    }
    guestVerificationAttempts.set(key, record);
    recentRequests.push(Date.now());
    checkoutRequestLimits.set(requestKey, recentRequests);
    clearAuthFailures(req.authAttemptKey);
    return res.json({
      message: "Mã xác minh đã được gửi tới email nhận thông báo đơn hàng.",
      requiresVerification: true,
      email,
      expiresInSeconds: otpTtlSeconds,
      ...(exposeVerificationCode ? { verificationCode: code } : {}),
    });
  });

  app.post("/api/checkout/verification/verify", rateLimitAuth, (req, res) => {
    const email = normalizeText(req.body.email);
    const code = String(req.body.code || "").trim();
    const key = temporaryKey(email);
    const record = guestVerificationAttempts.get(key);
    if (!emailPattern.test(email) || !/^\d{6}$/.test(code) || !record) {
      recordAuthFailure(req.authAttemptKey);
      return res.status(400).json({ message: "Email hoặc mã xác minh không hợp lệ." });
    }
    if (record.expiresAt < Date.now()) {
      guestVerificationAttempts.delete(key);
      return res.status(410).json({ message: "Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới." });
    }
    if (record.attempts >= otpMaxAttempts) {
      return res.status(429).json({ message: "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới." });
    }
    const expectedHash = hashVerificationCode(email, code, jwtSecret);
    if (!safeTextEqual(record.codeHash, expectedHash)) {
      record.attempts += 1;
      recordAuthFailure(req.authAttemptKey);
      return res.status(400).json({
        message: `Mã xác minh không đúng. Còn ${Math.max(0, otpMaxAttempts - record.attempts)} lần thử.`,
      });
    }
    guestVerificationAttempts.delete(key);
    clearAuthFailures(req.authAttemptKey);
    return res.json({
      message: "Email đã được xác minh cho lần đặt hàng này.",
      checkoutToken: createGuestCheckoutToken(email),
      expiresInSeconds: guestCheckoutTokenTtlSeconds,
    });
  });

  app.post("/api/orders", optionalAuth, limitOrderCreation, async (req, res) => {
    const customer = {
      name: String(req.body.customer?.name || "").trim(),
      email: normalizeText(req.body.customer?.email),
      phone: String(req.body.customer?.phone || "").trim(),
      address: String(req.body.customer?.address || "").trim(),
    };
    if (req.user?.role === "customer") {
      customer.email = normalizeText(req.user.email);
    }
    const savedCustomerRecord = req.user?.customerId
      ? store.data.customers.find((item) => item.id === req.user.customerId)
      : null;
    const requestedAddressSource = String(req.body.addressSource || "").trim().toLowerCase();
    const addressSource = !req.user
      ? "guest"
      : requestedAddressSource === "custom"
        ? "custom"
        : requestedAddressSource === "saved"
          ? "saved"
          : (savedCustomerRecord?.address
            && normalizeText(savedCustomerRecord.address) === normalizeText(customer.address)
            ? "saved"
            : "custom");
    if (addressSource === "saved") {
      if (!savedCustomerRecord?.address) {
        return res.status(400).json({
          message: "Tài khoản chưa có địa chỉ mặc định. Vui lòng nhập địa chỉ nhận hàng.",
          code: "SAVED_ADDRESS_REQUIRED",
        });
      }
      customer.address = savedCustomerRecord.address;
    }
    const validationError = validateCustomer(customer);
    if (validationError) return res.status(400).json({ message: validationError });
    if (!customer.email) {
      return res.status(400).json({ message: "Email nhận xác nhận đơn hàng là bắt buộc." });
    }
    const checkoutRequestId = String(req.body.requestId || "").trim();
    if (checkoutRequestId && !/^[A-Za-z0-9_-]{16,128}$/.test(checkoutRequestId)) {
      return res.status(400).json({ message: "Mã yêu cầu đặt hàng không hợp lệ." });
    }
    let guestCheckoutJti = null;
    if (!req.user) {
      try {
        const checkoutPayload = jwt.verify(String(req.body.checkoutToken || ""), jwtSecret, {
          algorithms: ["HS256"],
          audience: "novawear-checkout",
          issuer: "novawear-api",
        });
        if (checkoutPayload.type !== "guest_checkout"
          || !safeTextEqual(normalizeText(checkoutPayload.sub), customer.email)) {
          throw new Error("Guest checkout token mismatch");
        }
        if (!checkoutPayload.jti) {
          throw new Error("Guest checkout token has no identifier");
        }
        const existingGuestOrder = store.data.orders
          .find((item) => item.guestCheckoutJti === checkoutPayload.jti);
        if (existingGuestOrder) {
          return res.status(200).json({
            message: "Yêu cầu đặt hàng này đã được xử lý trước đó.",
            idempotent: true,
            data: publicOrder(existingGuestOrder),
          });
        }
        if (usedGuestCheckoutTokens.has(checkoutPayload.jti)) {
          throw new Error("Guest checkout token already used");
        }
        guestCheckoutJti = checkoutPayload.jti;
      } catch (_error) {
        return res.status(403).json({
          message: "Vui lòng xác minh email trước khi đặt hàng.",
          code: "GUEST_EMAIL_VERIFICATION_REQUIRED",
        });
      }
      if (store.data.users.some((item) => normalizeText(item.email) === customer.email)) {
        return res.status(409).json({
          message: "Email này đã có tài khoản. Vui lòng đăng nhập trước khi đặt hàng.",
          code: "ACCOUNT_LOGIN_REQUIRED",
        });
      }
    } else if (req.user.role !== "customer") {
      return res.status(403).json({ message: "Tài khoản nội bộ không thể đặt hàng tại cửa hàng." });
    }
    if (req.user && checkoutRequestId) {
      const existingOrder = store.data.orders.find((item) => (
        item.userId === req.user.id && item.checkoutRequestId === checkoutRequestId
      ));
      if (existingOrder) {
        return res.status(200).json({
          message: "Yêu cầu đặt hàng này đã được xử lý trước đó.",
          idempotent: true,
          data: publicOrder(existingOrder),
        });
      }
    }
    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({ message: "Giỏ hàng đang trống." });
    }

    const items = [];
    for (const requested of req.body.items) {
      const product = store.data.products.find((item) => item.id === requested.productId && item.status === "active");
      if (!product) return res.status(400).json({ message: "Có sản phẩm không còn được bán." });
      const quantity = asPositiveInt(requested.quantity, 1);
      if (quantity > product.stock) {
        return res.status(409).json({ message: `${product.name} chỉ còn ${product.stock} sản phẩm.` });
      }
      const variantCatalog = Array.isArray(product.variants) && product.variants.length
        ? product.variants
        : null;
      const defaultVariant = variantCatalog?.[0] || null;
      const size = String(requested.size || defaultVariant?.size || product.sizes?.[0] || "");
      const color = String(requested.color || defaultVariant?.color || product.colors?.[0] || "");
      if (product.sizes?.length && !product.sizes.includes(size)) {
        return res.status(400).json({ message: `Kích thước của ${product.name} chưa hợp lệ.` });
      }
      if (product.colors?.length && !product.colors.includes(color)) {
        return res.status(400).json({ message: `Màu của ${product.name} chưa hợp lệ.` });
      }
      const variant = productVariant(product, size, color);
      if (variantCatalog && !variant) {
        return res.status(400).json({
          message: `Tổ hợp màu ${color || "đã chọn"} và size ${size || "đã chọn"} của ${product.name} không còn bán.`,
          code: "PRODUCT_VARIANT_UNAVAILABLE",
        });
      }
      if (variant && quantity > Number(variant.stock || 0)) {
        return res.status(409).json({ message: `${product.name} (${color}, size ${size}) chỉ còn ${variant.stock} sản phẩm.` });
      }
      items.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        image: product.image,
        size,
        color,
        quantity,
        price: product.price,
      });
    }

    let customerRecord = savedCustomerRecord;
    if (!customerRecord && customer.email) {
      customerRecord = store.data.customers.find((item) => normalizeText(item.email) === customer.email);
    }

    const membership = membershipProfile(customerRecord?.totalSpent || 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingMethod = req.body.shippingMethod === "express" ? "express" : "standard";
    let shippingFee = shippingMethod === "express"
      ? 60000
      : (membership.freeShippingThreshold === 0 || subtotal >= membership.freeShippingThreshold ? 0 : 30000);
    const membershipDiscount = Math.min(
      subtotal,
      Math.round(subtotal * membership.discountPercent / 100),
    );
    let couponDiscount = 0;
    let couponCode = "";
    let appliedCoupon = null;
    if (req.body.couponCode) {
      const code = String(req.body.couponCode).trim().toUpperCase();
      const coupon = store.data.coupons.find((item) => item.code === code);
      const availabilityError = couponAvailabilityError(coupon, subtotal);
      if (availabilityError) {
        return res.status(availabilityError.status).json({
          message: availabilityError.message,
          code: availabilityError.code,
        });
      }
      couponCode = coupon.code;
      appliedCoupon = coupon;
      const benefit = couponBenefit(coupon, subtotal, shippingFee);
      couponDiscount = Math.min(benefit.discount, Math.max(0, subtotal - membershipDiscount));
      shippingFee = benefit.shippingFee;
    }
    const discount = membershipDiscount + couponDiscount;

    const orderNumber = store.data.orders.reduce((max, item) => {
      const match = item.id.match(/(\d+)$/);
      return Math.max(max, match ? Number(match[1]) : 0);
    }, 0) + 1;
    const year = new Date().getFullYear();
    const id = `ORD-${year}-${String(orderNumber).padStart(3, "0")}`;
    const trackingCode = createTrackingCode(store.data.orders, year);
    const createdAt = new Date().toISOString();
    const paymentMethod = ["cod", "bank"].includes(req.body.paymentMethod)
      ? req.body.paymentMethod
      : "cod";
    if (paymentMethod === "bank" && !sepayConfigured) {
      return res.status(503).json({
        message: "Thanh toán chuyển khoản đang tạm ngưng do SePay chưa được cấu hình đầy đủ.",
        code: "SEPAY_NOT_CONFIGURED",
      });
    }

    if (!customerRecord) {
      customerRecord = {
        id: store.nextId("customers", "cus-"),
        ...customer,
        tier: "Member",
        totalSpent: 0,
        orderCount: 0,
        status: "active",
        createdAt,
      };
      store.data.customers.push(customerRecord);
    } else if (!req.user && !store.data.users.some((item) => item.customerId === customerRecord.id)) {
      Object.assign(customerRecord, {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      });
    }
    customerRecord.tier = membership.tier;

    const order = {
      id,
      trackingCode,
      userId: req.user?.id || null,
      customerId: customerRecord.id,
      customer,
      items,
      subtotal,
      shippingFee,
      discount,
      membershipTier: membership.tier,
      membershipDiscount,
      couponDiscount,
      total: subtotal + shippingFee - discount,
      couponCode,
      couponUsageCountedAt: appliedCoupon ? createdAt : null,
      couponUsageRestoredAt: null,
      shippingMethod,
      paymentMethod,
      paymentProvider: paymentMethod === "bank" ? "sepay" : null,
      paymentCode: paymentMethod === "bank" ? trackingCode : null,
      paymentStatus: paymentMethod === "cod" ? "pending" : "awaiting",
      paymentExpiresAt: paymentMethod === "bank"
        ? new Date(Date.now() + orderPaymentExpirationSeconds * 1000).toISOString()
        : null,
      status: "pending",
      note: String(req.body.note || "").trim().slice(0, 500),
      addressConfirmation: {
        address: customer.address,
        confirmed: true,
        method: addressSource === "saved"
          ? "saved_profile_address"
          : addressSource === "guest"
            ? "guest_checkout_entry"
            : "checkout_override",
        confirmedAt: createdAt,
      },
      deliveryAddressSource: addressSource,
      checkoutRequestId: checkoutRequestId || null,
      guestCheckoutJti,
      assigneeId: null,
      shipment: { carrier: "", trackingNumber: "", estimatedDeliveryAt: null },
      deliveryAttempts: 0,
      version: 1,
      timeline: [],
      createdAt,
      updatedAt: createdAt,
    };

    const createdEvent = appendOrderEvent(order, {
      status: "pending",
      paymentStatus: order.paymentStatus,
      label: ORDER_STATUS_LABELS.pending,
      note: paymentMethod === "bank"
        ? "Đơn hàng đã được tiếp nhận và đang chờ thanh toán chuyển khoản."
        : "Đơn hàng đã được tiếp nhận.",
      actor: req.user || { name: customer.name, role: "customer" },
      source: req.user ? "customer" : "guest",
      at: createdAt,
    });
    let customerFacingEvent = createdEvent;
    if (paymentMethod === "cod") {
      order.status = "confirmed";
      customerFacingEvent = appendOrderEvent(order, {
        status: "confirmed",
        paymentStatus: order.paymentStatus,
        label: ORDER_STATUS_LABELS.confirmed,
        note: "Đơn COD được tự động xác nhận sau khi thông tin liên hệ và địa chỉ giao hàng đã được kiểm tra.",
        actor: { name: "Hệ thống NOVAWEAR", role: "system" },
        source: "system",
        at: createdAt,
      });
    }
    adjustOrderInventory(store, order, -1, `Giữ hàng cho đơn ${order.id}`, req.user || { name: customer.name });
    order.stockReservedAt = createdAt;
    if (guestCheckoutJti) {
      usedGuestCheckoutTokens.set(guestCheckoutJti, Date.now() + guestCheckoutTokenTtlSeconds * 1000);
      if (usedGuestCheckoutTokens.size > 5000) {
        const now = Date.now();
        for (const [jti, expiresAt] of usedGuestCheckoutTokens) {
          if (expiresAt < now) usedGuestCheckoutTokens.delete(jti);
        }
      }
    }
    if (appliedCoupon) {
      appliedCoupon.usedCount = Number(appliedCoupon.usedCount || 0) + 1;
    }
    store.data.orders.unshift(order);
    notifyOrderChange(store, order, customerFacingEvent, {
      type: "order_created",
      message: customerFacingEvent.note,
      operationsMessage: `${customer.name} vừa đặt ${items.length} sản phẩm, tổng ${order.total.toLocaleString("vi-VN")} ₫.`,
    });
    store.audit("create", "order", order.id, req.user || { name: customer.name });
    store.save();

    let emailWarning = null;
    try {
      await mailer.sendOrderConfirmation({ to: customer.email, order });
      order.emailNotification = {
        status: "sent",
        sentAt: new Date().toISOString(),
        to: customer.email,
      };
    } catch (_error) {
      emailWarning = "Đơn hàng đã được ghi nhận nhưng email xác nhận chưa gửi được.";
      order.emailNotification = {
        status: "failed",
        failedAt: new Date().toISOString(),
        to: customer.email,
      };
    }
    store.save();

    return res.status(201).json({
      message: emailWarning || "Đặt hàng thành công. Email xác nhận đã được gửi tới bạn.",
      ...(emailWarning ? { warning: emailWarning } : {}),
      data: publicOrder(order),
    });
  });

  app.get("/api/notifications", requireAuth, (req, res) => {
    expireAwaitingPaymentOrders();
    const limit = Math.min(asPositiveInt(req.query.limit, 30), 100);
    const visible = store.data.notifications
      .filter((item) => notificationVisibleTo(item, req.user))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const unreadCount = visible.filter((item) => !notificationReadAt(item, req.user)).length;
    const data = (String(req.query.unreadOnly || "false") === "true"
      ? visible.filter((item) => !notificationReadAt(item, req.user))
      : visible).slice(0, limit).map((item) => notificationForUser(item, req.user));
    return res.json({ data, unreadCount });
  });

  app.patch("/api/notifications/read-all", requireAuth, (req, res) => {
    const readAt = new Date().toISOString();
    let updated = 0;
    store.data.notifications.forEach((item) => {
      if (notificationVisibleTo(item, req.user) && !notificationReadAt(item, req.user)) {
        if (item.audience === "operations") {
          item.readBy = Array.isArray(item.readBy) ? item.readBy : [];
          item.readBy.push({ userId: req.user.id, at: readAt });
        } else {
          item.readAt = readAt;
        }
        updated += 1;
      }
    });
    if (updated) store.save();
    return res.json({ message: "Đã đánh dấu tất cả thông báo là đã đọc.", updated });
  });

  app.patch("/api/notifications/:id/read", requireAuth, (req, res) => {
    const notification = store.data.notifications.find((item) => item.id === req.params.id);
    if (!notification || !notificationVisibleTo(notification, req.user)) return notFound(res, "Thông báo");
    if (!notificationReadAt(notification, req.user)) {
      const readAt = new Date().toISOString();
      if (notification.audience === "operations") {
        notification.readBy = Array.isArray(notification.readBy) ? notification.readBy : [];
        notification.readBy.push({ userId: req.user.id, at: readAt });
      } else {
        notification.readAt = readAt;
      }
      store.save();
    }
    return res.json({ data: notificationForUser(notification, req.user) });
  });

  app.get("/api/orders/my", requireAuth, allowRoles("customer"), (req, res) => {
    expireAwaitingPaymentOrders();
    const orders = store.data.orders
      .filter((item) => item.userId === req.user.id || item.customerId === req.user.customerId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const reviewedProductIds = new Set(
      store.data.reviews
        .filter((item) => item.userId === req.user.id)
        .map((item) => item.productId),
    );
    const data = orders.map((order) => {
      const safeOrder = publicOrder(order);
      return {
        ...safeOrder,
        items: safeOrder.items.map((item) => ({
          ...item,
          reviewStatus: order.status !== "delivered"
            ? "unavailable"
            : reviewedProductIds.has(item.productId)
              ? "reviewed"
              : "eligible",
        })),
      };
    });
    res.json({ data });
  });

  app.get("/api/orders/track/:trackingCode", limitOrderTracking, (req, res) => {
    expireAwaitingPaymentOrders();
    const phone = String(req.query.phone || "").replace(/\s/g, "");
    if (!phonePattern.test(phone)) {
      return res.status(400).json({ message: "Vui lòng nhập số điện thoại nhận hàng để tra cứu." });
    }
    const order = store.data.orders.find(
      (item) => normalizeText(item.trackingCode) === normalizeText(req.params.trackingCode),
    );
    if (!order || order.customer.phone.replace(/\s/g, "") !== phone) {
      return notFound(res, "Đơn hàng");
    }
    const { customer, ...safeOrder } = publicOrder(order);
    return res.json({
      data: {
        ...safeOrder,
        customer: { name: customer.name, address: customer.address, phone: customer.phone.replace(/.(?=.{4})/g, "•") },
      },
    });
  });

  app.get("/api/orders/:id", requireAuth, allowRoles("customer"), (req, res) => {
    expireAwaitingPaymentOrders();
    const order = store.data.orders.find((item) => item.id === req.params.id);
    if (!order) return notFound(res, "Đơn hàng");
    if (order.userId !== req.user.id && order.customerId !== req.user.customerId) {
      return res.status(403).json({ message: "Bạn không thể xem đơn hàng này." });
    }
    return res.json({ data: publicOrder(order) });
  });

  app.patch("/api/orders/:id/cancel", requireAuth, allowRoles("customer"), (req, res) => {
    const order = store.data.orders.find((item) => item.id === req.params.id);
    if (!order) return notFound(res, "Đơn hàng");
    if (order.userId !== req.user.id && order.customerId !== req.user.customerId) {
      return res.status(403).json({ message: "Bạn không thể hủy đơn hàng này." });
    }
    if (req.body.expectedVersion === undefined) {
      return res.status(428).json({ message: "Thiếu phiên bản đơn hàng. Vui lòng tải lại trước khi hủy." });
    }
    if (Number(req.body.expectedVersion) !== Number(order.version || 1)) {
      return res.status(409).json({ message: "Đơn hàng vừa được cập nhật ở nơi khác. Vui lòng tải lại trước khi hủy." });
    }
    if (!["pending", "confirmed"].includes(order.status)) {
      return res.status(409).json({ message: "Đơn hàng đã được xử lý nên không thể hủy trực tuyến." });
    }
    const reason = String(req.body.reason || "").trim();
    const transitionError = validateOrderTransition(order, "cancelled", { reason });
    if (transitionError) return res.status(400).json({ message: transitionError });
    const event = applyOrderCancellation(store, order, {
      actor: req.user,
      source: "customer",
      reason,
    });
    store.audit("cancel", "order", order.id, req.user);
    store.save();
    queueOrderStatusEmail(order, event);
    return res.json({
      message: order.paymentStatus === "refund_pending"
        ? "Đã hủy đơn. Khoản thanh toán đang chờ được hoàn."
        : "Đã hủy đơn hàng và hoàn lại tồn kho.",
      data: publicOrder(order),
    });
  });

  app.get("/api/returns/my", requireAuth, allowRoles("customer"), (req, res) => {
    const ownedOrders = new Set(store.data.orders
      .filter((order) => order.userId === req.user.id || order.customerId === req.user.customerId)
      .map((order) => order.id));
    const data = store.data.returns
      .filter((item) => ownedOrders.has(item.orderId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ data: data.map(publicReturn) });
  });

  app.post("/api/returns", requireAuth, allowRoles("customer"), (req, res) => {
    const order = store.data.orders.find((item) => item.id === req.body.orderId);
    if (!order) return notFound(res, "Đơn hàng");
    if (order.userId !== req.user.id && order.customerId !== req.user.customerId) {
      return res.status(403).json({ message: "Bạn không thể tạo yêu cầu cho đơn này." });
    }
    if (order.status !== "delivered") {
      return res.status(409).json({ message: "Chỉ đơn đã giao thành công mới có thể đổi hoặc trả." });
    }
    if (!["paid", "partially_refunded"].includes(order.paymentStatus)) {
      return res.status(409).json({ message: "Đơn hàng cần hoàn tất đối soát thanh toán trước khi tạo yêu cầu đổi trả." });
    }
    const deliveredAt = order.timeline.find((item) => item.status === "delivered")?.at || order.updatedAt;
    if (Date.now() - new Date(deliveredAt).getTime() > 30 * 86400000) {
      return res.status(409).json({ message: "Đơn hàng đã quá thời hạn đổi trả 30 ngày." });
    }
    if (store.data.returns.some((item) => item.orderId === order.id
      && (!["completed", "rejected", "cancelled"].includes(item.status) || item.refundStatus === "pending"))) {
      return res.status(409).json({ message: "Đơn hàng đã có yêu cầu đổi trả đang xử lý." });
    }
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    const items = requestedItems.map((requested) => {
      const line = order.items.find((item) => item.productId === requested.productId
        && item.size === requested.size && item.color === requested.color);
      const quantity = asPositiveInt(requested.quantity);
      const alreadyRequested = store.data.returns
        .filter((entry) => entry.orderId === order.id && !["rejected", "cancelled"].includes(entry.status))
        .flatMap((entry) => entry.items || [])
        .filter((entry) => entry.productId === requested.productId
          && entry.size === requested.size && entry.color === requested.color)
        .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
      return line && quantity <= Number(line.quantity || 0) - alreadyRequested ? {
        productId: line.productId, name: line.name, image: line.image,
        size: line.size, color: line.color, quantity, price: line.price,
        desiredSize: String(requested.desiredSize || "").trim(),
        desiredColor: String(requested.desiredColor || "").trim(),
      } : null;
    }).filter(Boolean);
    const reason = String(req.body.reason || "").trim();
    if (!items.length || items.length !== requestedItems.length || reason.length < 5) {
      return res.status(400).json({ message: "Vui lòng chọn sản phẩm và nhập lý do đổi trả." });
    }
    const requestType = req.body.type === "exchange" ? "exchange" : "return";
    if (requestType === "exchange") {
      const invalidExchange = items.find((item) => !item.desiredSize || !item.desiredColor
        || (item.desiredSize === item.size && item.desiredColor === item.color));
      if (invalidExchange) {
        return res.status(400).json({ message: "Sản phẩm đổi phải có size hoặc màu mới hợp lệ." });
      }
    }
    const createdAt = new Date().toISOString();
    const grossRefund = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountShare = Number(order.subtotal || 0) > 0
      ? Math.round(Number(order.discount || 0) * (grossRefund / Number(order.subtotal)))
      : 0;
    const returnRequest = {
      id: store.nextId("returns", "ret-"),
      orderId: order.id,
      customerId: order.customerId,
      userId: req.user.id,
      type: requestType,
      reason,
      note: String(req.body.note || "").slice(0, 500),
      proofImages: Array.isArray(req.body.proofImages)
        ? req.body.proofImages.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 5)
        : [],
      items,
      refundAmount: requestType === "return" ? Math.max(0, grossRefund - discountShare) : 0,
      refundStatus: requestType === "return" ? "not_started" : "not_applicable",
      status: "requested",
      assigneeId: null,
      version: 1,
      timeline: [],
      createdAt,
      updatedAt: createdAt,
    };
    const event = appendReturnEvent(returnRequest, {
      status: "requested",
      label: RETURN_STATUS_LABELS.requested,
      note: `Khách hàng gửi yêu cầu ${requestType === "exchange" ? "đổi" : "trả"} sản phẩm: ${reason}`,
      actor: req.user,
      source: "customer",
      at: createdAt,
    });
    store.data.returns.unshift(returnRequest);
    notifyReturnChange(store, returnRequest, order, event);
    store.audit("create", "return", returnRequest.id, req.user);
    store.save();
    queueReturnStatusEmail(returnRequest, order, event);
    return res.status(201).json({ message: "Đã gửi yêu cầu đổi trả.", data: publicReturn(returnRequest) });
  });

  app.patch("/api/returns/:id/cancel", requireAuth, allowRoles("customer"), (req, res) => {
    const returnRequest = store.data.returns.find((entry) => entry.id === req.params.id);
    if (!returnRequest) return notFound(res, "Yêu cầu đổi trả");
    const order = store.data.orders.find((entry) => entry.id === returnRequest.orderId);
    if (!order || (order.userId !== req.user.id && order.customerId !== req.user.customerId)) {
      return res.status(403).json({ message: "Bạn không thể hủy yêu cầu này." });
    }
    if (req.body.expectedVersion === undefined) {
      return res.status(428).json({ message: "Thiếu phiên bản yêu cầu. Vui lòng tải lại trước khi hủy." });
    }
    if (Number(req.body.expectedVersion) !== Number(returnRequest.version || 1)) {
      return res.status(409).json({ message: "Yêu cầu vừa được cập nhật. Vui lòng tải lại trước khi thao tác." });
    }
    if (returnRequest.status !== "requested") {
      return res.status(409).json({ message: "Chỉ yêu cầu chưa được xử lý mới có thể hủy." });
    }
    const at = new Date().toISOString();
    returnRequest.status = "cancelled";
    touchReturn(returnRequest, at);
    const event = appendReturnEvent(returnRequest, {
      status: "cancelled",
      note: String(req.body.reason || "Khách hàng không còn nhu cầu đổi trả.").trim(),
      actor: req.user,
      source: "customer",
      at,
    });
    notifyReturnChange(store, returnRequest, order, event);
    store.audit("cancel", "return", returnRequest.id, req.user);
    store.save();
    queueReturnStatusEmail(returnRequest, order, event);
    return res.json({ message: "Đã hủy yêu cầu đổi trả.", data: publicReturn(returnRequest) });
  });

  app.post("/api/contact", limitPublicForms, (req, res) => {
    const name = String(req.body.name || "").trim().slice(0, 100);
    const email = normalizeText(req.body.email);
    const phone = String(req.body.phone || "").trim();
    const subject = String(req.body.subject || "Yêu cầu hỗ trợ").trim().slice(0, 160);
    const message = String(req.body.message || "").trim();
    if (name.length < 2 || !emailPattern.test(email)
      || (phone && !phonePattern.test(phone))
      || subject.length < 2
      || message.length < 10) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ họ tên, email và nội dung." });
    }
    const createdAt = new Date().toISOString();
    const contact = {
      id: store.nextId("contacts", "msg-"),
      channel: "form",
      name,
      email,
      phone,
      subject,
      message: message.slice(0, 2000),
      status: "new",
      messages: [{
        id: `chat-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        sender: "customer",
        senderId: null,
        senderName: name,
        body: message.slice(0, 2000),
        createdAt,
      }],
      operationsUnreadCount: 1,
      customerUnreadCount: 0,
      lastMessageAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    };
    store.data.contacts.unshift(contact);
    createNotification(store, {
      audience: "operations",
      contactId: contact.id,
      type: "support_request",
      title: `Yêu cầu hỗ trợ mới · ${name}`,
      message: contact.message,
      href: `/support?open=${encodeURIComponent(contact.id)}`,
      createdAt,
    });
    store.save();
    return res.status(201).json({ message: "NOVAWEAR đã nhận được lời nhắn của bạn." });
  });

  app.post(
    "/api/chat/conversations",
    optionalAuth,
    limitChatMessages,
    (req, res) => {
      const customerUser = req.user?.role === "customer" ? req.user : null;
      const name = String(customerUser?.name || req.body.name || "").trim().slice(0, 100);
      const email = normalizeText(customerUser?.email || req.body.email);
      const phone = String(customerUser?.phone || req.body.phone || "").trim();
      const body = String(req.body.message || "").trim();
      if (
        name.length < 2
        || !emailPattern.test(email)
        || (phone && !phonePattern.test(phone))
        || body.length < 2
        || body.length > 1000
      ) {
        return res.status(400).json({
          message: "Vui lòng nhập họ tên, email hợp lệ và nội dung từ 2 đến 1.000 ký tự.",
        });
      }

      const createdAt = new Date().toISOString();
      if (customerUser) {
        const existingContact = mergeChatConversationsForUser(store, customerUser);
        if (existingContact) {
          syncChatContactIdentity(existingContact, customerUser);
          appendChatMessage(existingContact, {
            sender: "customer",
            senderId: customerUser.id,
            senderName: customerUser.name,
            body,
            createdAt,
          });
          if (existingContact.status === "resolved") existingContact.status = "new";
          existingContact.operationsUnreadCount = Number(existingContact.operationsUnreadCount || 0) + 1;
          existingContact.customerUnreadCount = 0;
          createNotification(store, {
            audience: "operations",
            contactId: existingContact.id,
            type: "chat_message",
            title: `Tin nhắn mới · ${customerUser.name}`,
            message: body,
            href: `/support?open=${encodeURIComponent(existingContact.id)}`,
            createdAt,
          });
          store.audit("message", "chat_conversation", existingContact.id, customerUser);
          store.save();
          return res.json({
            message: "Tin nhắn đã được thêm vào cuộc trò chuyện hiện có.",
            data: publicChatConversation(existingContact),
            reused: true,
          });
        }
      }

      const guestToken = customerUser ? null : crypto.randomBytes(32).toString("base64url");
      const contact = {
        id: store.nextId("contacts", "chat-"),
        channel: "chat",
        userId: customerUser?.id || null,
        customerId: customerUser?.customerId || null,
        guestTokenHash: guestToken ? temporaryKey(guestToken) : null,
        name,
        email,
        phone,
        subject: "Trò chuyện trực tuyến",
        message: body,
        status: "new",
        messages: [],
        assigneeId: null,
        operationsUnreadCount: 1,
        customerUnreadCount: 0,
        lastMessageAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      };
      appendChatMessage(contact, {
        sender: "customer",
        senderId: customerUser?.id || null,
        senderName: name,
        body,
        createdAt,
      });
      store.data.contacts.unshift(contact);
      createNotification(store, {
        audience: "operations",
        contactId: contact.id,
        type: "chat_message",
        title: `Tin nhắn mới · ${name}`,
        message: body,
        href: `/support?open=${encodeURIComponent(contact.id)}`,
        createdAt,
      });
      store.audit("create", "chat_conversation", contact.id, customerUser || { name });
      store.save();
      return res.status(201).json({
        message: "Đã kết nối cuộc trò chuyện với NOVAWEAR.",
        data: publicChatConversation(contact),
        ...(guestToken ? { accessToken: guestToken } : {}),
      });
    },
  );

  app.get(
    "/api/chat/conversations/:id",
    optionalAuth,
    limitChatReads,
    (req, res) => {
      const contact = chatConversationForCustomer(req);
      if (!contact) return notFound(res, "Cuộc trò chuyện");
      if (req.query.markRead === "true" && Number(contact.customerUnreadCount || 0) > 0) {
        contact.customerUnreadCount = 0;
        contact.customerReadAt = new Date().toISOString();
        store.save();
      }
      return res.json({ data: publicChatConversation(contact) });
    },
  );

  app.post(
    "/api/chat/conversations/:id/messages",
    optionalAuth,
    limitChatMessages,
    (req, res) => {
      const contact = chatConversationForCustomer(req);
      if (!contact) return notFound(res, "Cuộc trò chuyện");
      const body = String(req.body.message || "").trim();
      if (body.length < 1 || body.length > 1000) {
        return res.status(400).json({ message: "Tin nhắn cần từ 1 đến 1.000 ký tự." });
      }
      if (req.user?.role === "customer") {
        syncChatContactIdentity(contact, req.user);
      }
      const createdAt = new Date().toISOString();
      const message = appendChatMessage(contact, {
        sender: "customer",
        senderId: req.user?.id || null,
        senderName: req.user?.name || contact.name,
        body,
        createdAt,
      });
      if (contact.status === "resolved") contact.status = "new";
      contact.operationsUnreadCount = Number(contact.operationsUnreadCount || 0) + 1;
      contact.customerUnreadCount = 0;
      createNotification(store, {
        audience: "operations",
        contactId: contact.id,
        type: "chat_message",
        title: `Tin nhắn mới · ${contact.name}`,
        message: body,
        href: `/support?open=${encodeURIComponent(contact.id)}`,
        createdAt,
      });
      store.audit("message", "chat_conversation", contact.id, req.user || { name: contact.name });
      store.save();
      return res.status(201).json({
        message: "Đã gửi tin nhắn.",
        data: publicChatConversation(contact),
        sentMessageId: message.id,
      });
    },
  );

  app.post("/api/newsletter", limitPublicForms, (req, res) => {
    const email = normalizeText(req.body.email);
    if (!emailPattern.test(email)) return res.status(400).json({ message: "Email chưa đúng định dạng." });
    if (!store.data.subscribers.some((item) => item.email === email)) {
      store.data.subscribers.push({ id: `sub-${Date.now()}`, email, createdAt: new Date().toISOString() });
      store.save();
    }
    return res.json({ message: "Đăng ký nhận tin thành công." });
  });

  const admin = express.Router();
  admin.use(requireAuth, allowRoles("admin", "staff"));

  admin.get("/overview", allowRoles("admin"), (_req, res) => {
    expireAwaitingPaymentOrders();
    const activeOrders = store.data.orders.filter(completedOrder);
    const today = localDateKey();
    const revenueDate = (order) => localDateKey(order.deliveredAt || order.updatedAt || order.createdAt);
    const revenue = activeOrders.reduce((sum, item) => sum + item.total, 0);
    const todayRevenue = activeOrders
      .filter((item) => revenueDate(item) === today)
      .reduce((sum, item) => sum + item.total, 0);
    const revenueByDay = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = localDateKey(date);
      return {
        date: key,
        label: date.toLocaleDateString("vi-VN", { weekday: "short", timeZone: appTimeZone }),
        value: activeOrders
          .filter((item) => revenueDate(item) === key)
          .reduce((sum, item) => sum + item.total, 0),
      };
    });
    const statusCounts = Object.keys(ORDER_STATUS_LABELS).reduce((result, status) => {
      result[status] = store.data.orders.filter((item) => item.status === status).length;
      return result;
    }, {});
    res.json({
      data: {
        revenue,
        todayRevenue,
        orderCount: store.data.orders.length,
        customerCount: store.data.customers.length,
        productCount: store.data.products.filter((item) => item.status !== "archived").length,
        lowStockCount: store.data.products.filter((item) => item.status === "active" && item.stock <= 20).length,
        pendingCount: statusCounts.pending,
        awaitingPaymentCount: store.data.orders.filter((item) => ["pending", "awaiting"].includes(item.paymentStatus)).length,
        returnCount: store.data.returns.filter((item) => !["completed", "rejected", "cancelled"].includes(item.status)).length,
        revenueByDay,
        statusCounts,
        recentOrders: [...store.data.orders]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 6),
        topProducts: [...store.data.products]
          .sort((a, b) => b.sold - a.sold)
          .slice(0, 5)
          .map((item) => publicProduct(item, store.data.categories)),
        lowStock: store.data.products
          .filter((item) => item.status === "active" && item.stock <= 20)
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 6),
      },
    });
  });

  admin.get("/products", (req, res) => {
    const search = normalizeText(req.query.search);
    const categoryId = String(req.query.categoryId || "");
    const status = String(req.query.status || "all");
    const page = asPositiveInt(req.query.page, 1);
    const requestedLimit = req.query.limit || req.query.pageSize;
    const limit = Math.min(asPositiveInt(requestedLimit, 24), 100);
    const sales = orderSalesByProduct(store.data.orders);
    let items = store.data.products.map((item) => ({
      ...item,
      sold: sales.get(item.id) || 0,
      category: store.data.categories.find((cat) => cat.id === item.categoryId) || null,
    }));
    if (search) items = items.filter((item) => normalizeText(`${item.name} ${item.sku}`).includes(search));
    if (categoryId) items = items.filter((item) => item.categoryId === categoryId);
    if (status !== "all") items = items.filter((item) => item.status === status);
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const paginated = requestedLimit !== undefined || req.query.page !== undefined;
    const data = paginated ? items.slice((safePage - 1) * limit, safePage * limit) : items;
    const allProducts = store.data.products;
    res.json({
      data,
      pagination: { page: safePage, limit: paginated ? limit : total || limit, total, totalPages: paginated ? totalPages : 1 },
      summary: {
        total: allProducts.length,
        active: allProducts.filter((item) => item.status === "active").length,
        draft: allProducts.filter((item) => item.status === "draft").length,
        archived: allProducts.filter((item) => item.status === "archived").length,
        totalStock: allProducts.reduce((sum, item) => sum + asMoney(item.stock), 0),
        inventoryValue: allProducts.reduce((sum, item) => sum + asMoney(item.cost) * asMoney(item.stock), 0),
      },
    });
  });

  admin.post("/products", allowRoles("admin"), (req, res) => {
    const name = String(req.body.name || "").trim();
    const sku = String(req.body.sku || "").trim().toUpperCase();
    const categoryId = String(req.body.categoryId || "");
    if (name.length < 3 || !sku || !store.data.categories.some((item) => item.id === categoryId)) {
      return res.status(400).json({ message: "Tên, SKU hoặc danh mục sản phẩm chưa hợp lệ." });
    }
    if (store.data.products.some((item) => normalizeText(item.sku) === normalizeText(sku))) {
      return res.status(409).json({ message: "SKU đã tồn tại." });
    }
    const price = Number(req.body.price);
    const comparePrice = Number(req.body.comparePrice || 0);
    const cost = Number(req.body.cost || 0);
    const stock = Number(req.body.stock || 0);
    const saleEndsAt = req.body.saleEndsAt ? new Date(req.body.saleEndsAt) : null;
    if (!Number.isFinite(price) || price <= 0
      || !Number.isFinite(comparePrice) || comparePrice < 0
      || (comparePrice > 0 && comparePrice < price)
      || !Number.isFinite(cost) || cost < 0
      || !Number.isInteger(stock) || stock < 0
      || (saleEndsAt && Number.isNaN(saleEndsAt.getTime()))) {
      return res.status(400).json({ message: "Giá, tồn kho, giá niêm yết hoặc thời hạn ưu đãi chưa hợp lệ." });
    }
    const product = {
      id: store.nextId("products", "prd-"),
      sku,
      name,
      slug: slugify(req.body.slug || name),
      categoryId,
      price: Math.round(price),
      comparePrice: Math.round(comparePrice),
      saleEndsAt: saleEndsAt ? saleEndsAt.toISOString() : "",
      cost: Math.round(cost),
      stock,
      status: ["active", "draft", "archived"].includes(req.body.status) ? req.body.status : "draft",
      featured: Boolean(req.body.featured),
      badge: String(req.body.badge || ""),
      audience: ["men", "women", "unisex"].includes(req.body.audience) ? req.body.audience : "unisex",
      image: String(req.body.image || "/Images/11-0_672x990.jpg"),
      images: Array.isArray(req.body.images) && req.body.images.length ? req.body.images : [String(req.body.image || "/Images/11-0_672x990.jpg")],
      colors: Array.isArray(req.body.colors) ? req.body.colors : String(req.body.colors || "").split(",").map((item) => item.trim()).filter(Boolean),
      sizes: Array.isArray(req.body.sizes) ? req.body.sizes : String(req.body.sizes || "").split(",").map((item) => item.trim()).filter(Boolean),
      variants: Array.isArray(req.body.variants) ? req.body.variants.map((item) => ({
        size: String(item.size || ""), color: String(item.color || ""), stock: asMoney(item.stock),
      })).filter((item) => item.size || item.color) : [],
      description: String(req.body.description || ""),
      longDescription: String(req.body.longDescription || ""),
      materials: String(req.body.materials || ""),
      care: String(req.body.care || ""),
      fit: String(req.body.fit || ""),
      suitableFor: String(req.body.suitableFor || ""),
      modelInfo: String(req.body.modelInfo || ""),
      origin: String(req.body.origin || ""),
      highlights: Array.isArray(req.body.highlights) ? req.body.highlights.slice(0, 8) : [],
      featureDetails: Array.isArray(req.body.featureDetails) ? req.body.featureDetails.slice(0, 8) : [],
      rating: 0,
      reviewCount: 0,
      sold: 0,
      createdAt: new Date().toISOString(),
    };
    store.data.products.push(product);
    syncProductStock(product);
    store.audit("create", "product", product.id, req.user);
    store.save();
    return res.status(201).json({ message: "Đã tạo sản phẩm.", data: product });
  });

  admin.put("/products/:id", allowRoles("admin"), (req, res) => {
    const product = store.data.products.find((item) => item.id === req.params.id);
    if (!product) return notFound(res, "Sản phẩm");
    const allowed = ["name", "sku", "categoryId", "price", "comparePrice", "saleEndsAt", "cost", "stock", "status", "featured", "badge", "audience", "image", "images", "colors", "sizes", "variants", "description", "longDescription", "materials", "care", "fit", "suitableFor", "modelInfo", "origin", "highlights", "featureDetails"];
    const nextProduct = { ...product };
    for (const field of allowed) {
      if (req.body[field] !== undefined) nextProduct[field] = req.body[field];
    }
    nextProduct.name = String(nextProduct.name || "").trim();
    nextProduct.sku = String(nextProduct.sku || "").trim().toUpperCase();
    nextProduct.slug = slugify(req.body.slug || nextProduct.name);
    nextProduct.categoryId = String(nextProduct.categoryId || "");
    nextProduct.status = String(nextProduct.status || "draft");
    nextProduct.audience = String(nextProduct.audience || "unisex");
    const nextPrice = Number(nextProduct.price);
    const nextComparePrice = Number(nextProduct.comparePrice || 0);
    const nextCost = Number(nextProduct.cost || 0);
    const nextStock = Number(nextProduct.stock || 0);
    const nextSaleEndsAt = nextProduct.saleEndsAt ? new Date(nextProduct.saleEndsAt) : null;
    if (!nextProduct.name || !nextProduct.sku) return res.status(400).json({ message: "Tên và SKU là bắt buộc." });
    if (store.data.products.some((item) => item.id !== product.id && normalizeText(item.sku) === normalizeText(nextProduct.sku))) {
      return res.status(409).json({ message: "SKU đã tồn tại." });
    }
    if (!store.data.categories.some((item) => item.id === nextProduct.categoryId)) {
      return res.status(400).json({ message: "Danh mục sản phẩm không tồn tại." });
    }
    if (!["active", "draft", "archived"].includes(nextProduct.status)
      || !["men", "women", "unisex"].includes(nextProduct.audience)) {
      return res.status(400).json({ message: "Trạng thái hoặc đối tượng sản phẩm chưa hợp lệ." });
    }
    if (!Number.isFinite(nextPrice) || nextPrice <= 0
      || !Number.isFinite(nextComparePrice) || nextComparePrice < 0
      || (nextComparePrice > 0 && nextComparePrice < nextPrice)
      || !Number.isFinite(nextCost) || nextCost < 0
      || !Number.isInteger(nextStock) || nextStock < 0
      || (nextSaleEndsAt && Number.isNaN(nextSaleEndsAt.getTime()))) {
      return res.status(400).json({ message: "Giá, tồn kho, giá niêm yết hoặc thời hạn ưu đãi chưa hợp lệ." });
    }
    nextProduct.price = Math.round(nextPrice);
    nextProduct.comparePrice = Math.round(nextComparePrice);
    nextProduct.cost = Math.round(nextCost);
    nextProduct.stock = nextStock;
    nextProduct.saleEndsAt = nextSaleEndsAt ? nextSaleEndsAt.toISOString() : "";
    if (Array.isArray(nextProduct.variants)) nextProduct.variants = nextProduct.variants
      .map((item) => ({ size: String(item.size || ""), color: String(item.color || ""), stock: asMoney(item.stock) }))
      .filter((item) => item.size || item.color);
    Object.assign(product, nextProduct);
    syncProductStock(product);
    store.audit("update", "product", product.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật sản phẩm.", data: product });
  });

  admin.delete("/products/:id", allowRoles("admin"), (req, res) => {
    const product = store.data.products.find((item) => item.id === req.params.id);
    if (!product) return notFound(res, "Sản phẩm");
    if (store.data.orders.some((order) => order.items.some((item) => item.productId === product.id))) {
      product.status = "archived";
      store.audit("archive", "product", product.id, req.user);
      store.save();
      return res.json({ message: "Sản phẩm đã có giao dịch nên được chuyển vào lưu trữ.", data: product });
    }
    store.data.products = store.data.products.filter((item) => item.id !== product.id);
    store.audit("delete", "product", product.id, req.user);
    store.save();
    return res.json({ message: "Đã xóa sản phẩm." });
  });

  admin.get("/news", allowRoles("admin"), (_req, res) => res.json({ data: store.data.news || [] }));
  admin.post("/news", allowRoles("admin"), (req, res) => {
    const title = String(req.body.title || "").trim();
    const status = req.body.status === "draft" ? "draft" : req.body.status === "published" || req.body.status === undefined ? "published" : null;
    const publishedAt = req.body.publishedAt ? new Date(req.body.publishedAt) : new Date();
    if (title.length < 5 || !status || Number.isNaN(publishedAt.getTime())) {
      return res.status(400).json({ message: "Tiêu đề, trạng thái hoặc thời gian xuất bản chưa hợp lệ." });
    }
    const article = { id: store.nextId("news", "news-"), title, excerpt: String(req.body.excerpt || ""), content: String(req.body.content || ""), category: String(req.body.category || "NOVA Journal"), image: String(req.body.image || "/Images/nova-v3/home-story.png"), status, publishedAt: publishedAt.toISOString() };
    store.data.news = store.data.news || [];
    store.data.news.push(article);
    store.audit("create", "news", article.id, req.user);
    store.save();
    return res.status(201).json({ message: "Đã tạo bài viết.", data: article });
  });
  admin.put("/news/:id", allowRoles("admin"), (req, res) => {
    const article = (store.data.news || []).find((item) => item.id === req.params.id);
    if (!article) return notFound(res, "Bài viết");
    const nextTitle = String(req.body.title ?? article.title).trim();
    const nextStatus = String(req.body.status ?? article.status ?? "published");
    const nextPublishedAt = new Date(req.body.publishedAt ?? article.publishedAt ?? Date.now());
    if (nextTitle.length < 5 || !["draft", "published"].includes(nextStatus) || Number.isNaN(nextPublishedAt.getTime())) {
      return res.status(400).json({ message: "Tiêu đề, trạng thái hoặc thời gian xuất bản chưa hợp lệ." });
    }
    article.title = nextTitle;
    ["excerpt", "content", "category", "image"].forEach((field) => { if (req.body[field] !== undefined) article[field] = String(req.body[field]); });
    article.status = nextStatus;
    article.publishedAt = nextPublishedAt.toISOString();
    store.audit("update", "news", article.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật bài viết.", data: article });
  });
  admin.delete("/news/:id", allowRoles("admin"), (req, res) => {
    const initial = (store.data.news || []).length;
    store.data.news = (store.data.news || []).filter((item) => item.id !== req.params.id);
    if (store.data.news.length === initial) return notFound(res, "Bài viết");
    store.audit("delete", "news", req.params.id, req.user);
    store.save();
    return res.json({ message: "Đã xóa bài viết." });
  });

  admin.get("/categories", (_req, res) => {
    res.json({
      data: store.data.categories.map((item) => ({
        ...item,
        productCount: store.data.products.filter((product) => product.categoryId === item.id && product.status !== "archived").length,
      })),
    });
  });

  admin.get("/coupons", allowRoles("admin"), (_req, res) => res.json({ data: store.data.coupons || [] }));
  admin.post("/coupons", allowRoles("admin"), (req, res) => {
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return res.status(400).json({ message: "Mã ưu đãi chưa hợp lệ." });
    if ((store.data.coupons || []).some((item) => item.code === code)) return res.status(409).json({ message: "Mã ưu đãi đã tồn tại." });
    const type = String(req.body.type || "percent");
    const value = asMoney(req.body.value);
    const usageLimit = Number(req.body.usageLimit || 0);
    const startsAt = new Date(req.body.startsAt || Date.now());
    const expiresAt = new Date(req.body.expiresAt || Date.now() + 30 * 86400000);
    if (!["percent", "fixed", "shipping"].includes(type)
      || value <= 0
      || (type === "percent" && value > 100)
      || !Number.isInteger(usageLimit)
      || usageLimit < 0
      || Number.isNaN(startsAt.getTime())
      || Number.isNaN(expiresAt.getTime())
      || startsAt >= expiresAt) {
      return res.status(400).json({ message: "Giá trị, thời gian hoặc giới hạn sử dụng của mã ưu đãi chưa hợp lệ." });
    }
    const coupon = {
      code,
      type,
      value,
      minOrder: asMoney(req.body.minOrder),
      maxDiscount: asMoney(req.body.maxDiscount),
      active: req.body.active !== false,
      startsAt: startsAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      usageLimit,
      usedCount: 0,
    };
    store.data.coupons = store.data.coupons || [];
    store.data.coupons.push(coupon);
    store.audit("create", "coupon", code, req.user);
    store.save();
    return res.status(201).json({ message: "Đã thêm mã ưu đãi.", data: coupon });
  });
  admin.put("/coupons/:code", allowRoles("admin"), (req, res) => {
    const coupon = (store.data.coupons || [])
      .find((item) => item.code === String(req.params.code || "").toUpperCase());
    if (!coupon) return notFound(res, "Mã ưu đãi");
    const nextType = String(req.body.type ?? coupon.type);
    const nextValue = asMoney(req.body.value ?? coupon.value);
    const nextUsageLimit = Number(req.body.usageLimit ?? coupon.usageLimit ?? 0);
    const nextStartsAt = new Date(req.body.startsAt ?? coupon.startsAt ?? 0);
    const nextExpiresAt = new Date(req.body.expiresAt ?? coupon.expiresAt);
    if (!["percent", "fixed", "shipping"].includes(nextType)
      || nextValue <= 0
      || (nextType === "percent" && nextValue > 100)
      || !Number.isInteger(nextUsageLimit)
      || nextUsageLimit < 0
      || (nextUsageLimit > 0 && nextUsageLimit < Number(coupon.usedCount || 0))
      || Number.isNaN(nextStartsAt.getTime())
      || Number.isNaN(nextExpiresAt.getTime())
      || nextStartsAt >= nextExpiresAt) {
      return res.status(400).json({ message: "Giá trị, thời gian hoặc giới hạn sử dụng của mã ưu đãi chưa hợp lệ." });
    }
    Object.assign(coupon, {
      type: nextType,
      value: nextValue,
      minOrder: asMoney(req.body.minOrder ?? coupon.minOrder),
      maxDiscount: asMoney(req.body.maxDiscount ?? coupon.maxDiscount),
      active: req.body.active === undefined ? coupon.active : Boolean(req.body.active),
      startsAt: nextStartsAt.toISOString(),
      expiresAt: nextExpiresAt.toISOString(),
      usageLimit: nextUsageLimit,
    });
    store.audit("update", "coupon", coupon.code, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật mã ưu đãi.", data: coupon });
  });
  admin.delete("/coupons/:code", allowRoles("admin"), (req, res) => { const before = (store.data.coupons || []).length; store.data.coupons = (store.data.coupons || []).filter((item) => item.code !== req.params.code); if (store.data.coupons.length === before) return notFound(res, "Mã ưu đãi"); store.audit("delete", "coupon", req.params.code, req.user); store.save(); return res.json({ message: "Đã xóa mã ưu đãi." }); });

  admin.post("/categories", allowRoles("admin"), (req, res) => {
    const name = String(req.body.name || "").trim();
    if (name.length < 2) return res.status(400).json({ message: "Tên danh mục chưa hợp lệ." });
    const slug = slugify(req.body.slug || name);
    if (store.data.categories.some((item) => item.slug === slug)) {
      return res.status(409).json({ message: "Danh mục đã tồn tại." });
    }
    const category = {
      id: store.nextId("categories", "cat-"),
      name,
      slug,
      description: String(req.body.description || ""),
      audience: ["men", "women", "all"].includes(String(req.body.audience)) ? String(req.body.audience) : "all",
      status: "active",
    };
    store.data.categories.push(category);
    store.audit("create", "category", category.id, req.user);
    store.save();
    return res.status(201).json({ message: "Đã tạo danh mục.", data: category });
  });

  admin.put("/categories/:id", allowRoles("admin"), (req, res) => {
    const category = store.data.categories.find((item) => item.id === req.params.id);
    if (!category) return notFound(res, "Danh mục");
    const nextName = String(req.body.name ?? category.name).trim();
    const nextSlug = slugify(req.body.slug || nextName);
    const nextAudience = String(req.body.audience ?? category.audience ?? "all");
    const nextStatus = String(req.body.status ?? category.status ?? "active");
    if (nextName.length < 2 || !nextSlug
      || !["men", "women", "all"].includes(nextAudience)
      || !["active", "inactive"].includes(nextStatus)) {
      return res.status(400).json({ message: "Tên, slug, đối tượng hoặc trạng thái danh mục chưa hợp lệ." });
    }
    if (store.data.categories.some((item) => item.id !== category.id && item.slug === nextSlug)) {
      return res.status(409).json({ message: "Slug danh mục đã tồn tại." });
    }
    category.name = nextName;
    category.description = req.body.description !== undefined ? String(req.body.description) : category.description;
    category.audience = nextAudience;
    category.status = nextStatus;
    category.slug = nextSlug;
    store.audit("update", "category", category.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật danh mục.", data: category });
  });

  admin.delete("/categories/:id", allowRoles("admin"), (req, res) => {
    const category = store.data.categories.find((item) => item.id === req.params.id);
    if (!category) return notFound(res, "Danh mục");
    const productCount = store.data.products.filter((item) => item.categoryId === category.id && item.status !== "archived").length;
    if (productCount > 0) return res.status(409).json({ message: "Không thể xóa danh mục đang có sản phẩm." });
    store.data.categories = store.data.categories.filter((item) => item.id !== category.id);
    store.audit("delete", "category", category.id, req.user);
    store.save();
    return res.json({ message: "Đã xóa danh mục." });
  });

  admin.get("/orders", (req, res) => {
    expireAwaitingPaymentOrders();
    const search = normalizeText(req.query.search);
    const status = String(req.query.status || "all");
    let orders = [...store.data.orders];
    if (req.user.role === "staff") {
      if (!req.user.employeeId) {
        return res.status(403).json({ message: "Tài khoản nhân viên chưa được liên kết hồ sơ làm việc." });
      }
      orders = orders.filter((item) => !item.assigneeId || item.assigneeId === req.user.employeeId);
    }
    if (status !== "all") orders = orders.filter((item) => item.status === status);
    if (search) {
      orders = orders.filter((item) => normalizeText(`${item.id} ${item.trackingCode} ${item.customer.name} ${item.customer.phone}`).includes(search));
    }
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ data: orders });
  });

  admin.get("/orders/:id", (req, res) => {
    expireAwaitingPaymentOrders();
    const order = store.data.orders.find((item) => item.id === req.params.id);
    if (!order) return notFound(res, "Đơn hàng");
    if (req.user.role === "staff"
      && (!req.user.employeeId || (order.assigneeId && order.assigneeId !== req.user.employeeId))) {
      return res.status(403).json({ message: "Đơn hàng đang được một nhân viên khác phụ trách." });
    }
    return res.json({ data: order });
  });

  admin.patch("/orders/:id", (req, res) => {
    const order = store.data.orders.find((item) => item.id === req.params.id);
    if (!order) return notFound(res, "Đơn hàng");
    if (req.user.role === "staff") {
      if (!req.user.employeeId) {
        return res.status(403).json({ message: "Tài khoản nhân viên chưa được liên kết hồ sơ làm việc." });
      }
      if (order.assigneeId && order.assigneeId !== req.user.employeeId) {
        return res.status(403).json({ message: "Đơn hàng đang được một nhân viên khác phụ trách." });
      }
    }
    if (req.body.expectedVersion === undefined) {
      return res.status(428).json({ message: "Thiếu phiên bản đơn hàng. Vui lòng tải lại và thử lại." });
    }
    if (Number(req.body.expectedVersion) !== Number(order.version || 1)) {
      return res.status(409).json({ message: "Đơn hàng vừa được cập nhật ở nơi khác. Vui lòng tải lại dữ liệu." });
    }
    if (req.body.paymentStatus !== undefined) {
      return res.status(400).json({ message: "Trạng thái thanh toán được cập nhật bởi SePay, giao hàng COD hoặc quy trình hoàn tiền." });
    }

    let assigneeChanged = false;
    let nextAssigneeId = order.assigneeId
      || (req.user.role === "staff" ? req.user.employeeId : null);
    if (req.body.assigneeId !== undefined) {
      const requestedAssigneeId = String(req.body.assigneeId || "").trim();
      if (req.user.role === "staff" && requestedAssigneeId !== req.user.employeeId) {
        return res.status(403).json({ message: "Nhân viên chỉ có thể nhận đơn cho chính mình." });
      }
      const assignee = requestedAssigneeId
        ? store.data.employees.find((item) => item.id === requestedAssigneeId && item.status === "active")
        : null;
      if (requestedAssigneeId && !assignee) {
        return res.status(400).json({ message: "Nhân viên được phân công không hợp lệ hoặc đã ngừng hoạt động." });
      }
      nextAssigneeId = assignee ? assignee.id : null;
      assigneeChanged = nextAssigneeId !== (order.assigneeId || null);
    }
    const nextInternalNote = req.body.note !== undefined
      ? String(req.body.note).slice(0, 500)
      : String(order.internalNote || "");

    const nextStatus = req.body.status;
    let event = null;
    if (nextStatus && nextStatus !== order.status) {
      const changes = {
        reason: String(req.body.reason || "").trim(),
        publicNote: String(req.body.publicNote || "").trim(),
        internalNote: String(req.body.internalNote || nextInternalNote || "").trim(),
        shipment: req.body.shipment && typeof req.body.shipment === "object" ? req.body.shipment : null,
      };
      const transitionError = validateOrderTransition(order, nextStatus, changes);
      if (transitionError) return res.status(409).json({ message: transitionError });
      order.assigneeId = nextAssigneeId;
      order.internalNote = nextInternalNote;
      event = applyOrderTransition(store, order, nextStatus, {
        ...changes,
        actor: req.user,
        source: "operations",
      });
    } else if (assigneeChanged || req.body.note !== undefined) {
      order.assigneeId = nextAssigneeId;
      order.internalNote = nextInternalNote;
      const at = touchOrder(order);
      const assignee = store.data.employees.find((item) => item.id === order.assigneeId);
      event = appendOrderEvent(order, {
        eventType: "assignment",
        status: order.status,
        paymentStatus: order.paymentStatus,
        label: assignee ? `Đã phân công ${assignee.name}` : "Đã bỏ phân công xử lý",
        internalNote: order.internalNote,
        actor: req.user,
        source: "operations",
        at,
      });
    }
    store.audit("update", "order", order.id, req.user);
    store.save();
    if (nextStatus && event) queueOrderStatusEmail(order, event);
    return res.json({ message: "Đã cập nhật đơn hàng.", data: order });
  });

  admin.patch("/orders/:id/refund", allowRoles("admin"), (req, res) => {
    const order = store.data.orders.find((item) => item.id === req.params.id);
    if (!order) return notFound(res, "Đơn hàng");
    if (req.body.expectedVersion === undefined || Number(req.body.expectedVersion) !== Number(order.version || 1)) {
      return res.status(409).json({ message: "Đơn hàng vừa được cập nhật. Vui lòng tải lại trước khi xác nhận hoàn tiền." });
    }
    if (order.paymentStatus !== "refund_pending") {
      return res.status(409).json({ message: "Đơn hàng không ở trạng thái chờ hoàn tiền." });
    }
    if (order.status !== "cancelled") {
      return res.status(409).json({ message: "Khoản hoàn do đổi trả phải được đối soát tại yêu cầu đổi trả tương ứng." });
    }
    const reason = String(req.body.reason || "").trim();
    if (reason.length < 5) return res.status(400).json({ message: "Cần ghi lý do hoặc nội dung đối soát hoàn tiền." });
    const at = touchOrder(order);
    order.paymentStatus = "refunded";
    order.refundedAt = at;
    order.refundReference = String(req.body.reference || "").trim().slice(0, 160);
    const event = appendOrderEvent(order, {
      eventType: "payment",
      status: order.status,
      paymentStatus: "refunded",
      label: PAYMENT_STATUS_LABELS.refunded,
      note: "Khoản thanh toán đã được hoàn lại cho khách hàng.",
      internalNote: reason,
      actor: req.user,
      source: "operations",
      at,
    });
    notifyOrderChange(store, order, event, { type: "payment_refunded", message: event.note });
    rebuildCustomerMetrics(store, order.customerId);
    store.audit("refund_completed", "order", order.id, req.user);
    store.save();
    queueOrderStatusEmail(order, event);
    return res.json({ message: "Đã xác nhận hoàn tiền cho khách hàng.", data: order });
  });

  admin.patch("/orders/:id/payment-reconcile", allowRoles("admin"), (req, res) => {
    const order = store.data.orders.find((item) => item.id === req.params.id);
    if (!order) return notFound(res, "Đơn hàng");
    if (req.body.expectedVersion === undefined
      || Number(req.body.expectedVersion) !== Number(order.version || 1)) {
      return res.status(409).json({ message: "Đơn hàng vừa được cập nhật. Vui lòng tải lại trước khi đối soát." });
    }
    if (order.paymentStatus !== "review_required") {
      return res.status(409).json({ message: "Đơn hàng không ở trạng thái cần đối soát thanh toán." });
    }
    const reference = String(req.body.reference || "").trim().slice(0, 160);
    const reason = String(req.body.reason || "").trim().slice(0, 1000);
    if (reference.length < 4 || reason.length < 5) {
      return res.status(400).json({ message: "Cần nhập mã chứng từ và nội dung đối soát thanh toán." });
    }
    const at = touchOrder(order);
    order.paymentStatus = "paid";
    order.paidAt = order.paidAt || at;
    order.paymentReconciledAt = at;
    order.paymentReconciliation = { reference, reason, actorId: req.user.id };
    const event = appendOrderEvent(order, {
      eventType: "payment",
      status: order.status,
      paymentStatus: "paid",
      label: "Đã đối soát thanh toán",
      note: "Bộ phận tài chính đã xác nhận đơn hàng được thanh toán đầy đủ.",
      internalNote: `${reason} · Chứng từ: ${reference}`,
      actor: req.user,
      source: "operations",
      at,
    });
    notifyOrderChange(store, order, event, { type: "payment_paid", message: event.note });
    rebuildCustomerMetrics(store, order.customerId);
    store.audit("payment_reconciled", "order", order.id, req.user);
    store.save();
    queueOrderStatusEmail(order, event);
    return res.json({ message: "Đã xác nhận đối soát thanh toán.", data: order });
  });

  admin.get("/customers", (req, res) => {
    const search = normalizeText(req.query.search);
    let customers = [...store.data.customers];
    if (search) customers = customers.filter((item) => normalizeText(`${item.name} ${item.email} ${item.phone}`).includes(search));
    customers.sort((a, b) => b.totalSpent - a.totalSpent);
    res.json({ data: customers });
  });

  admin.post("/customers", (req, res) => {
    const requestedTier = String(req.body.tier || "Member").trim();
    if (requestedTier !== "Member") {
      return res.status(400).json({ message: "Hạng thành viên do hệ thống tự tính từ các đơn đã giao và đã thanh toán." });
    }
    const customer = {
      id: store.nextId("customers", "cus-"),
      name: String(req.body.name || "").trim(),
      email: normalizeText(req.body.email),
      phone: String(req.body.phone || "").trim(),
      address: String(req.body.address || "").trim(),
      tier: "Member",
      totalSpent: 0,
      orderCount: 0,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    if (customer.name.length < 2 || !phonePattern.test(customer.phone) || (customer.email && !emailPattern.test(customer.email))) {
      return res.status(400).json({ message: "Thông tin khách hàng chưa hợp lệ." });
    }
    if (customer.email && (
      store.data.customers.some((item) => normalizeText(item.email) === customer.email)
      || store.data.users.some((item) => normalizeText(item.email) === customer.email)
    )) {
      return res.status(409).json({ message: "Email này đã được hồ sơ khác sử dụng." });
    }
    store.data.customers.push(customer);
    store.audit("create", "customer", customer.id, req.user);
    store.save();
    return res.status(201).json({ message: "Đã thêm khách hàng.", data: customer });
  });

  admin.put("/customers/:id", (req, res) => {
    const customer = store.data.customers.find((item) => item.id === req.params.id);
    if (!customer) return notFound(res, "Khách hàng");
    if (req.body.tier !== undefined && String(req.body.tier) !== String(customer.tier)) {
      return res.status(400).json({ message: "Hạng thành viên do hệ thống tự tính từ các đơn đã giao và đã thanh toán." });
    }
    const changesProtectedFields = req.user.role !== "admin"
      && req.body.status !== undefined
      && String(req.body.status) !== String(customer.status);
    if (changesProtectedFields) {
      return res.status(403).json({ message: "Chỉ quản trị viên được khóa hoặc mở tài khoản khách hàng." });
    }
    const linkedUser = store.data.users.find((item) => item.customerId === customer.id) || null;
    const nextName = String(req.body.name ?? customer.name).trim();
    const nextEmail = normalizeText(req.body.email ?? customer.email);
    const nextPhone = String(req.body.phone ?? customer.phone).trim();
    const nextStatus = ["active", "inactive"].includes(String(req.body.status))
      ? String(req.body.status)
      : customer.status;
    if (!nextName || !phonePattern.test(nextPhone) || (nextEmail && !emailPattern.test(nextEmail))) {
      return res.status(400).json({ message: "Thông tin khách hàng chưa hợp lệ." });
    }
    if (linkedUser && nextEmail !== normalizeText(linkedUser.email)) {
      return res.status(409).json({
        message: "Email đăng nhập không thể đổi từ hồ sơ khách hàng vì cần xác minh lại quyền sở hữu email.",
      });
    }
    const emailInUse = nextEmail && (
      store.data.customers.some((item) => item.id !== customer.id && normalizeText(item.email) === nextEmail)
      || store.data.users.some((item) => item.id !== linkedUser?.id && normalizeText(item.email) === nextEmail)
    );
    if (emailInUse) return res.status(409).json({ message: "Email này đã được hồ sơ khác sử dụng." });
    const previousStatus = customer.status;
    customer.name = nextName;
    customer.email = nextEmail;
    customer.phone = nextPhone;
    customer.status = nextStatus;
    if (req.body.address !== undefined) customer.address = String(req.body.address).trim();
    if (linkedUser) {
      linkedUser.name = nextName;
      linkedUser.phone = nextPhone;
      if (nextStatus === "inactive") linkedUser.status = "inactive";
      if (previousStatus === "inactive" && nextStatus === "active" && linkedUser.emailVerifiedAt) {
        linkedUser.status = "active";
      }
      if (previousStatus !== nextStatus) linkedUser.tokenVersion = Number(linkedUser.tokenVersion || 0) + 1;
    }
    rebuildCustomerMetrics(store, customer.id);
    store.audit("update", "customer", customer.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật khách hàng.", data: customer });
  });

  admin.get("/employees", allowRoles("admin"), (req, res) => {
    const search = normalizeText(req.query.search);
    const department = String(req.query.department || "");
    let employees = [...store.data.employees];
    if (search) employees = employees.filter((item) => normalizeText(`${item.name} ${item.employeeCode} ${item.email} ${item.phone}`).includes(search));
    if (department) employees = employees.filter((item) => item.department === department);
    res.json({ data: employees });
  });

  admin.post("/employees", allowRoles("admin"), (req, res) => {
    const email = normalizeText(req.body.email);
    if (!emailPattern.test(email)
      || store.data.employees.some((item) => normalizeText(item.email) === email)
      || store.data.users.some((item) => normalizeText(item.email) === email)) {
      return res.status(409).json({ message: "Email nhân viên chưa hợp lệ hoặc đã tồn tại." });
    }
    const createAccount = req.body.createAccount === true;
    const temporaryPassword = String(req.body.temporaryPassword || "Welcome@2026!");
    if (createAccount && !validPassword(temporaryPassword, { minLength: 12, requireSpecial: true })) {
      return res.status(400).json({
        message: "Mật khẩu tạm cần từ 12 đến 128 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
      });
    }
    const employeeStatus = String(req.body.status || "active");
    const joinDate = req.body.joinDate ? new Date(req.body.joinDate) : new Date();
    const performance = Number(req.body.performance === undefined ? 80 : req.body.performance);
    if (!["active", "on_leave", "inactive"].includes(employeeStatus)
      || Number.isNaN(joinDate.getTime())
      || !Number.isFinite(performance) || performance < 0 || performance > 100) {
      return res.status(400).json({ message: "Trạng thái, ngày vào làm hoặc hiệu suất nhân viên chưa hợp lệ." });
    }
    if (createAccount && employeeStatus !== "active") {
      return res.status(400).json({ message: "Chỉ nhân viên đang hoạt động mới được tạo tài khoản đăng nhập." });
    }
    const employee = {
      id: store.nextId("employees", "emp-"),
      employeeCode: `NV${String(store.data.employees.length + 1).padStart(3, "0")}`,
      name: String(req.body.name || "").trim(),
      email,
      phone: String(req.body.phone || "").trim(),
      roleTitle: String(req.body.roleTitle || "Nhân viên"),
      department: String(req.body.department || "Bán hàng"),
      status: employeeStatus,
      joinDate: joinDate.toISOString().slice(0, 10),
      shift: String(req.body.shift || "09:00 - 18:00"),
      performance: Math.round(performance),
      address: String(req.body.address || ""),
      avatar: String(req.body.avatar || ""),
    };
    if (employee.name.length < 2 || !phonePattern.test(employee.phone)) {
      return res.status(400).json({ message: "Họ tên hoặc số điện thoại chưa hợp lệ." });
    }
    store.data.employees.push(employee);
    if (createAccount) {
      store.data.users.push({
        id: store.nextId("users", "usr-"),
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: req.body.accountRole === "admin" ? "admin" : "staff",
        employeeId: employee.id,
        customerId: null,
        status: "active",
        emailVerifiedAt: new Date().toISOString(),
        mustChangePassword: true,
        tokenVersion: 0,
        passwordHash: hashPassword(temporaryPassword),
        createdAt: new Date().toISOString(),
      });
    }
    store.audit("create", "employee", employee.id, req.user);
    store.save();
    return res.status(201).json({ message: "Đã thêm nhân viên.", data: employee });
  });

  admin.put("/employees/:id", allowRoles("admin"), (req, res) => {
    const employee = store.data.employees.find((item) => item.id === req.params.id);
    if (!employee) return notFound(res, "Nhân viên");
    const linkedUser = store.data.users.find((item) => item.employeeId === employee.id) || null;
    const nextName = String(req.body.name ?? employee.name).trim();
    const nextEmail = normalizeText(req.body.email ?? employee.email);
    const nextPhone = String(req.body.phone ?? employee.phone).trim();
    const nextStatus = ["active", "on_leave", "inactive"].includes(String(req.body.status))
      ? String(req.body.status)
      : employee.status;
    if (nextName.length < 2 || !emailPattern.test(nextEmail) || !phonePattern.test(nextPhone)) {
      return res.status(400).json({ message: "Thông tin nhân viên chưa hợp lệ." });
    }
    const emailInUse = store.data.employees.some((item) => item.id !== employee.id && normalizeText(item.email) === nextEmail)
      || store.data.users.some((item) => item.id !== linkedUser?.id && normalizeText(item.email) === nextEmail);
    if (emailInUse) return res.status(409).json({ message: "Email này đã được tài khoản khác sử dụng." });
    if (linkedUser?.id === req.user.id && nextStatus === "inactive") {
      return res.status(409).json({ message: "Không thể tự khóa hồ sơ đang đăng nhập." });
    }
    const activeAdmins = store.data.users.filter((item) => (
      item.role === "admin" && item.status === "active" && item.emailVerifiedAt
    )).length;
    if (linkedUser?.role === "admin" && linkedUser.status === "active"
      && nextStatus === "inactive" && activeAdmins <= 1) {
      return res.status(409).json({ message: "Hệ thống phải luôn còn ít nhất một quản trị viên hoạt động." });
    }

    const previousEmail = normalizeText(employee.email);
    const previousStatus = employee.status;
    ["roleTitle", "department", "joinDate", "shift", "address", "avatar"].forEach((field) => {
      if (req.body[field] !== undefined) employee[field] = String(req.body[field]);
    });
    employee.name = nextName;
    employee.email = nextEmail;
    employee.phone = nextPhone;
    employee.status = nextStatus;
    if (req.body.performance !== undefined) employee.performance = req.body.performance;
    employee.performance = Math.min(100, Math.max(0, asMoney(employee.performance)));
    if (linkedUser) {
      linkedUser.name = nextName;
      linkedUser.email = nextEmail;
      linkedUser.phone = nextPhone;
      if (nextStatus === "inactive") linkedUser.status = "inactive";
      if (previousStatus === "inactive" && nextStatus !== "inactive") linkedUser.status = "active";
      if (previousEmail !== nextEmail || previousStatus !== nextStatus) {
        linkedUser.tokenVersion = Number(linkedUser.tokenVersion || 0) + 1;
      }
    }
    store.audit("update", "employee", employee.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật nhân viên.", data: employee });
  });

  admin.delete("/employees/:id", allowRoles("admin"), (req, res) => {
    const employee = store.data.employees.find((item) => item.id === req.params.id);
    if (!employee) return notFound(res, "Nhân viên");
    const user = store.data.users.find((item) => item.employeeId === employee.id);
    if (user?.id === req.user.id) {
      return res.status(409).json({ message: "Không thể tự khóa tài khoản đang đăng nhập." });
    }
    const activeAdmins = store.data.users.filter((item) => (
      item.role === "admin" && item.status === "active" && item.emailVerifiedAt
    )).length;
    if (user?.role === "admin" && user.status === "active" && activeAdmins <= 1) {
      return res.status(409).json({ message: "Hệ thống phải luôn còn ít nhất một quản trị viên hoạt động." });
    }
    employee.status = "inactive";
    if (user) {
      user.status = "inactive";
      user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    }
    store.audit("deactivate", "employee", employee.id, req.user);
    store.save();
    return res.json({ message: "Đã ngừng hoạt động tài khoản nhân viên.", data: employee });
  });

  admin.get("/users", allowRoles("admin"), (_req, res) => {
    res.json({ data: store.data.users.map(sanitizeUser) });
  });

  admin.patch("/users/:id", allowRoles("admin"), (req, res) => {
    const user = store.data.users.find((item) => item.id === req.params.id);
    if (!user) return notFound(res, "Tài khoản");
    if (req.body.verified !== undefined) {
      return res.status(400).json({
        message: "Trạng thái xác minh chỉ được thay đổi bằng mã OTP hoặc nhà cung cấp đăng nhập đã xác thực.",
      });
    }

    const nextStatus = req.body.status && ["active", "inactive", "pending"].includes(req.body.status)
      ? req.body.status
      : user.status;
    const nextRole = req.body.role && ["admin", "staff", "customer"].includes(req.body.role)
      ? req.body.role
      : user.role;
    const securityChanged = nextStatus !== user.status || nextRole !== user.role;
    if (user.id === req.user.id && securityChanged) {
      return res.status(409).json({ message: "Không thể tự đổi quyền hoặc tự khóa tài khoản đang đăng nhập." });
    }
    if (nextRole !== user.role) {
      const validOperationsRoleChange = Boolean(user.employeeId)
        && ["admin", "staff"].includes(user.role)
        && ["admin", "staff"].includes(nextRole);
      if (!validOperationsRoleChange) {
        return res.status(400).json({
          message: "Tài khoản khách hàng không thể đổi thành tài khoản nội bộ. Hãy tạo hồ sơ nhân viên riêng.",
        });
      }
    }
    const activeAdmins = store.data.users.filter((item) => (
      item.role === "admin" && item.status === "active" && item.emailVerifiedAt
    )).length;
    const removesActiveAdmin = user.role === "admin"
      && user.status === "active"
      && user.emailVerifiedAt
      && (nextRole !== "admin" || nextStatus !== "active");
    if (removesActiveAdmin && activeAdmins <= 1) {
      return res.status(409).json({ message: "Hệ thống phải luôn còn ít nhất một quản trị viên hoạt động." });
    }

    user.status = nextStatus;
    user.role = nextRole;
    if (securityChanged) {
      user.tokenVersion = Number(user.tokenVersion || 0) + 1;
      const employee = store.data.employees.find((item) => item.id === user.employeeId);
      if (employee && nextStatus === "inactive") employee.status = "inactive";
      if (employee && nextStatus === "active" && employee.status === "inactive") employee.status = "active";
    }
    store.audit("update", "user", user.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật tài khoản.", data: sanitizeUser(user) });
  });

  admin.get("/inventory", (req, res) => {
    const search = normalizeText(req.query.search);
    const level = String(req.query.level || "all");
    let items = store.data.products.filter((item) => item.status !== "archived");
    if (search) items = items.filter((item) => normalizeText(`${item.name} ${item.sku}`).includes(search));
    if (level === "low") items = items.filter((item) => item.stock > 0 && item.stock <= 20);
    if (level === "out") items = items.filter((item) => item.stock === 0);
    if (level === "healthy") items = items.filter((item) => item.stock > 20);
    res.json({
      data: items.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        image: item.image,
        stock: item.stock,
        variants: item.variants || [],
        cost: item.cost,
        retailValue: item.price * item.stock,
        status: item.stock === 0 ? "out" : item.stock <= 20 ? "low" : "healthy",
      })),
    });
  });

  admin.post("/inventory/adjust", allowRoles("admin"), (req, res) => {
    const product = store.data.products.find((item) => item.id === req.body.productId);
    if (!product) return notFound(res, "Sản phẩm");
    const quantity = Number.parseInt(req.body.quantity, 10);
    if (!Number.isFinite(quantity) || quantity === 0 || product.stock + quantity < 0) {
      return res.status(400).json({ message: "Số lượng điều chỉnh không hợp lệ." });
    }
    const before = product.stock;
    if (Array.isArray(product.variants) && product.variants.length && !req.body.size && !req.body.color) {
      return res.status(400).json({ message: "Sản phẩm có biến thể; hãy chọn đúng size và màu để điều chỉnh tồn kho." });
    }
    if (req.body.size || req.body.color) {
      const variant = productVariant(product, req.body.size, req.body.color);
      if (!variant) return res.status(400).json({ message: "Biến thể size/màu không tồn tại." });
      if (variant.stock + quantity < 0) return res.status(400).json({ message: "Tồn kho biến thể không đủ." });
      changeProductStock(product, quantity, req.body.size, req.body.color);
    } else {
      product.stock += quantity;
    }
    store.data.inventoryMovements.unshift({
      id: store.nextId("inventoryMovements", "mov-"), productId: product.id,
      size: String(req.body.size || ""), color: String(req.body.color || ""),
      quantity, reason: String(req.body.reason || "Điều chỉnh thủ công"),
      before, after: product.stock, actorId: req.user.id, createdAt: new Date().toISOString(),
    });
    store.audit(`${quantity > 0 ? "increase" : "decrease"}_stock:${before}->${product.stock}`, "product", product.id, req.user);
    store.save();
    return res.json({ message: "Đã điều chỉnh tồn kho.", data: product });
  });

  admin.get("/inventory/movements", (req, res) => {
    const productId = String(req.query.productId || "");
    const data = store.data.inventoryMovements
      .filter((item) => !productId || item.productId === productId)
      .slice(0, 100)
      .map((item) => ({
        ...item,
        product: store.data.products.find((product) => product.id === item.productId) || null,
      }));
    return res.json({ data });
  });

  admin.get("/purchase-orders", (_req, res) => {
    const data = store.data.purchaseOrders.map((order) => ({
      ...order,
      items: order.items.map((line) => ({
        ...line,
        product: store.data.products.find((item) => item.id === line.productId) || null,
      })),
    }));
    res.json({ data });
  });

  admin.post("/purchase-orders", allowRoles("admin"), (req, res) => {
    const supplier = String(req.body.supplier || "").trim();
    const expectedDate = req.body.expectedDate ? new Date(req.body.expectedDate) : null;
    if (supplier.length < 2 || !Array.isArray(req.body.items) || !req.body.items.length
      || (expectedDate && Number.isNaN(expectedDate.getTime()))) {
      return res.status(400).json({ message: "Nhà cung cấp và danh sách nhập hàng là bắt buộc." });
    }
    const items = [];
    for (const line of req.body.items) {
      const product = store.data.products.find((item) => item.id === line.productId);
      if (!product) return res.status(400).json({ message: "Sản phẩm nhập kho không tồn tại." });
      const quantity = Number(line.quantity);
      const unitCost = line.unitCost === undefined || line.unitCost === ""
        ? Number(product.cost || 0)
        : Number(line.unitCost);
      if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
        return res.status(400).json({ message: "Số lượng và giá nhập của từng sản phẩm phải hợp lệ." });
      }
      if (items.some((item) => item.productId === product.id)) {
        return res.status(400).json({ message: "Mỗi sản phẩm chỉ được xuất hiện một lần trong phiếu nhập." });
      }
      items.push({ productId: product.id, quantity, unitCost: Math.round(unitCost) });
    }
    const purchaseOrder = {
      id: `PO-${new Date().getFullYear()}-${String(store.data.purchaseOrders.length + 1).padStart(3, "0")}`,
      supplier,
      expectedDate: expectedDate ? expectedDate.toISOString() : null,
      status: "ordered",
      total: items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
      items,
      createdAt: new Date().toISOString(),
    };
    store.data.purchaseOrders.unshift(purchaseOrder);
    store.audit("create", "purchase_order", purchaseOrder.id, req.user);
    store.save();
    return res.status(201).json({ message: "Đã tạo phiếu nhập hàng.", data: purchaseOrder });
  });

  admin.patch("/purchase-orders/:id/receive", allowRoles("admin"), (req, res) => {
    const purchaseOrder = store.data.purchaseOrders.find((item) => item.id === req.params.id);
    if (!purchaseOrder) return notFound(res, "Phiếu nhập");
    if (purchaseOrder.status === "received") return res.status(409).json({ message: "Phiếu này đã được nhập kho." });
    for (const line of purchaseOrder.items) {
      const product = store.data.products.find((item) => item.id === line.productId);
      if (product) {
        product.stock += line.quantity;
        product.cost = line.unitCost;
      }
    }
    purchaseOrder.status = "received";
    purchaseOrder.receivedAt = new Date().toISOString();
    purchaseOrder.receivedBy = req.user.id;
    store.audit("receive", "purchase_order", purchaseOrder.id, req.user);
    store.save();
    return res.json({ message: "Đã nhập hàng vào kho.", data: purchaseOrder });
  });

  admin.get("/contacts", (req, res) => {
    let contacts = store.data.contacts.filter((item) => !item.mergedIntoId);
    if (req.user.role === "staff") {
      contacts = contacts.filter((item) => !item.assigneeId || item.assigneeId === req.user.id);
    }
    return res.json({
      data: contacts
        .sort((a, b) => (
          new Date(b.lastMessageAt || b.updatedAt || b.createdAt)
          - new Date(a.lastMessageAt || a.updatedAt || a.createdAt)
        ))
        .map(operationsChatConversation),
    });
  });

  admin.get("/contacts/:id", (req, res) => {
    const contact = resolveStoredContact(store, req.params.id);
    if (!contact) return notFound(res, "Yêu cầu hỗ trợ");
    if (req.user.role === "staff" && contact.assigneeId && contact.assigneeId !== req.user.id) {
      return res.status(403).json({ message: "Yêu cầu hỗ trợ đang được một nhân viên khác phụ trách." });
    }
    if (Number(contact.operationsUnreadCount || 0) > 0) {
      contact.operationsUnreadCount = 0;
      contact.operationsReadAt = new Date().toISOString();
      store.save();
    }
    return res.json({ data: operationsChatConversation(contact) });
  });

  admin.patch("/contacts/:id", (req, res) => {
    const contact = resolveStoredContact(store, req.params.id);
    if (!contact) return notFound(res, "Yêu cầu hỗ trợ");
    if (req.user.role === "staff" && contact.assigneeId && contact.assigneeId !== req.user.id) {
      return res.status(403).json({ message: "Yêu cầu hỗ trợ đang được một nhân viên khác phụ trách." });
    }
    if (!["new", "in_progress", "resolved"].includes(req.body.status)) {
      return res.status(400).json({ message: "Trạng thái yêu cầu hỗ trợ không hợp lệ." });
    }
    contact.status = req.body.status;
    contact.assigneeId = req.user.id;
    contact.assigneeName = req.user.name;
    contact.operationsUnreadCount = 0;
    contact.updatedAt = new Date().toISOString();
    store.audit("update", "contact", contact.id, req.user);
    store.save();
    return res.json({
      message: "Đã cập nhật yêu cầu hỗ trợ.",
      data: operationsChatConversation(contact),
    });
  });

  admin.post("/contacts/:id/messages", (req, res) => {
    const contact = resolveStoredContact(store, req.params.id);
    if (!contact) return notFound(res, "Yêu cầu hỗ trợ");
    if (contact.channel !== "chat") {
      return res.status(409).json({
        message: "Yêu cầu từ biểu mẫu cần được trả lời qua email hoặc điện thoại.",
      });
    }
    if (req.user.role === "staff" && contact.assigneeId && contact.assigneeId !== req.user.id) {
      return res.status(403).json({ message: "Cuộc trò chuyện đang được một nhân viên khác phụ trách." });
    }
    const body = String(req.body.message || "").trim();
    if (body.length < 1 || body.length > 1000) {
      return res.status(400).json({ message: "Tin nhắn cần từ 1 đến 1.000 ký tự." });
    }
    const createdAt = new Date().toISOString();
    const message = appendChatMessage(contact, {
      sender: "operations",
      senderId: req.user.id,
      senderName: req.user.name,
      body,
      createdAt,
    });
    contact.assigneeId = contact.assigneeId || req.user.id;
    contact.assigneeName = contact.assigneeName || req.user.name;
    contact.status = contact.status === "resolved" ? "in_progress" : contact.status;
    if (contact.status === "new") contact.status = "in_progress";
    contact.operationsUnreadCount = 0;
    contact.customerUnreadCount = Number(contact.customerUnreadCount || 0) + 1;
    if (contact.userId || contact.customerId) {
      createNotification(store, {
        audience: "customer",
        userId: contact.userId,
        customerId: contact.customerId,
        contactId: contact.id,
        type: "chat_reply",
        title: "NOVAWEAR đã trả lời tin nhắn",
        message: body,
        href: "/?chat=open",
        createdAt,
      });
    }
    store.audit("reply", "chat_conversation", contact.id, req.user);
    store.save();
    return res.status(201).json({
      message: "Đã gửi trả lời cho khách hàng.",
      data: operationsChatConversation(contact),
      sentMessageId: message.id,
    });
  });

  admin.get("/returns", (req, res) => {
    let returns = [...store.data.returns];
    if (req.user.role === "staff") {
      if (!req.user.employeeId) {
        return res.status(403).json({ message: "Tài khoản nhân viên chưa được liên kết hồ sơ làm việc." });
      }
      returns = returns.filter((item) => !item.assigneeId || item.assigneeId === req.user.employeeId);
    }
    const data = returns.map((item) => ({
      ...item,
      order: store.data.orders.find((order) => order.id === item.orderId) || null,
      assignee: store.data.employees.find((employee) => employee.id === item.assigneeId) || null,
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ data });
  });

  admin.patch("/returns/:id", (req, res) => {
    const returnRequest = store.data.returns.find((entry) => entry.id === req.params.id);
    if (!returnRequest) return notFound(res, "Yêu cầu đổi trả");
    if (req.user.role === "staff") {
      if (!req.user.employeeId) {
        return res.status(403).json({ message: "Tài khoản nhân viên chưa được liên kết hồ sơ làm việc." });
      }
      if (returnRequest.assigneeId && returnRequest.assigneeId !== req.user.employeeId) {
        return res.status(403).json({ message: "Yêu cầu đang được một nhân viên khác phụ trách." });
      }
    }
    let nextAssigneeId = returnRequest.assigneeId
      || (req.user.role === "staff" ? req.user.employeeId : null);
    if (req.body.assigneeId !== undefined) {
      const requestedAssigneeId = String(req.body.assigneeId || "").trim();
      if (req.user.role === "staff" && requestedAssigneeId !== req.user.employeeId) {
        return res.status(403).json({ message: "Nhân viên chỉ có thể nhận yêu cầu cho chính mình." });
      }
      const assignee = requestedAssigneeId
        ? store.data.employees.find((item) => item.id === requestedAssigneeId && item.status === "active")
        : null;
      if (requestedAssigneeId && !assignee) {
        return res.status(400).json({ message: "Nhân viên được phân công không hợp lệ hoặc đã ngừng hoạt động." });
      }
      nextAssigneeId = assignee ? assignee.id : null;
    }
    if (req.body.expectedVersion === undefined) {
      return res.status(428).json({ message: "Thiếu phiên bản yêu cầu. Vui lòng tải lại và thử lại." });
    }
    if (Number(req.body.expectedVersion) !== Number(returnRequest.version || 1)) {
      return res.status(409).json({ message: "Yêu cầu vừa được cập nhật ở nơi khác. Vui lòng tải lại dữ liệu." });
    }
    const nextStatus = String(req.body.status || returnRequest.status);
    if (!RETURN_STATUS_LABELS[nextStatus]) return res.status(400).json({ message: "Trạng thái không hợp lệ." });
    if (nextStatus === returnRequest.status) {
      return res.status(400).json({ message: "Vui lòng chọn bước xử lý tiếp theo." });
    }
    if (!(ALLOWED_RETURN_TRANSITIONS[returnRequest.status] || []).includes(nextStatus)) {
      return res.status(409).json({
        message: `Không thể chuyển từ “${RETURN_STATUS_LABELS[returnRequest.status]}” sang “${RETURN_STATUS_LABELS[nextStatus]}”.`,
      });
    }
    const publicNote = String(req.body.publicNote || "").trim().slice(0, 500);
    const internalNote = String(req.body.internalNote || "").trim().slice(0, 1000);
    if (["approved", "rejected"].includes(nextStatus) && publicNote.length < 5) {
      return res.status(400).json({ message: "Cần nhập nội dung phản hồi rõ ràng cho khách hàng." });
    }
    if (returnRequest.status === "inspecting" && ["completed", "rejected"].includes(nextStatus)
      && internalNote.length < 5) {
      return res.status(400).json({ message: "Cần ghi kết quả kiểm tra sản phẩm trước khi kết thúc yêu cầu." });
    }
    if (nextStatus === "completed" && returnRequest.type === "exchange") {
      const carrier = String(req.body.exchangeShipment?.carrier || "").trim();
      const trackingNumber = String(req.body.exchangeShipment?.trackingNumber || "").trim();
      if (carrier.length < 2 || trackingNumber.length < 4) {
        return res.status(400).json({ message: "Cần nhập đơn vị vận chuyển và mã vận đơn của sản phẩm đổi." });
      }
    }
    if (nextStatus === "completed"
      && !["restock", "quality_hold", "damaged"].includes(req.body.inventoryDisposition)) {
      return res.status(400).json({ message: "Cần chọn cách xử lý tồn kho sau khi kiểm tra sản phẩm." });
    }
    if (nextStatus === "approved" && returnRequest.type === "exchange") {
      const availabilityError = exchangeAvailabilityError(store, returnRequest);
      if (availabilityError) return res.status(409).json({ message: availabilityError });
    }

    const order = store.data.orders.find((entry) => entry.id === returnRequest.orderId);
    const at = new Date().toISOString();
    if (nextStatus === "approved" && returnRequest.type === "exchange") {
      reserveExchangeInventory(store, returnRequest, req.user);
    }
    if (nextStatus === "rejected") {
      releaseExchangeInventory(store, returnRequest, req.user);
      returnRequest.rejectedAt = at;
      returnRequest.rejectionReason = publicNote;
    }
    if (nextStatus === "receiving") {
      returnRequest.receivingAt = at;
      returnRequest.returnShipment = {
        carrier: String(req.body.returnShipment?.carrier || returnRequest.returnShipment?.carrier || "").trim().slice(0, 120),
        trackingNumber: String(req.body.returnShipment?.trackingNumber
          || returnRequest.returnShipment?.trackingNumber || "").trim().slice(0, 120),
      };
    }
    if (nextStatus === "inspecting") returnRequest.inspectionStartedAt = at;
    if (nextStatus === "completed") {
      returnRequest.completedAt = at;
      returnRequest.inspectionResult = internalNote;
      returnRequest.inventoryDisposition = req.body.inventoryDisposition;
      returnRequest.inventoryDispositionAt = at;
      if (returnRequest.inventoryDisposition === "restock") {
        restockReturnedItems(store, returnRequest, req.user);
      }
      if (returnRequest.type === "exchange") {
        returnRequest.exchangeShipment = {
          carrier: String(req.body.exchangeShipment?.carrier || "").trim().slice(0, 120),
          trackingNumber: String(req.body.exchangeShipment?.trackingNumber || "").trim().slice(0, 120),
        };
      } else if (order?.paymentStatus === "paid" || order?.paymentStatus === "partially_refunded") {
        returnRequest.refundStatus = "pending";
        order.paymentStatus = "refund_pending";
        order.refundAmount = Number(returnRequest.refundAmount || 0);
        const orderAt = touchOrder(order, at);
        const paymentEvent = appendOrderEvent(order, {
          eventType: "payment",
          status: order.status,
          paymentStatus: "refund_pending",
          label: PAYMENT_STATUS_LABELS.refund_pending,
          note: `Yêu cầu ${returnRequest.id} đã kiểm tra xong và đang chờ hoàn ${Number(returnRequest.refundAmount || 0).toLocaleString("vi-VN")} ₫.`,
          actor: req.user,
          source: "operations",
          at: orderAt,
        });
        notifyOrderChange(store, order, paymentEvent, { type: "refund_pending", message: paymentEvent.note });
        queueOrderStatusEmail(order, paymentEvent);
      } else {
        returnRequest.refundStatus = "not_required";
      }
    }

    returnRequest.status = nextStatus;
    returnRequest.assigneeId = nextAssigneeId;
    returnRequest.internalNote = internalNote || returnRequest.internalNote || "";
    const eventAt = touchReturn(returnRequest, at);
    const event = appendReturnEvent(returnRequest, {
      status: nextStatus,
      label: RETURN_STATUS_LABELS[nextStatus],
      note: publicNote || RETURN_STATUS_LABELS[nextStatus],
      internalNote,
      actor: req.user,
      source: "operations",
      at: eventAt,
    });
    notifyReturnChange(store, returnRequest, order, event);
    store.audit("update", "return", returnRequest.id, req.user);
    store.save();
    queueReturnStatusEmail(returnRequest, order, event);
    return res.json({ message: "Đã cập nhật yêu cầu đổi trả.", data: returnRequest });
  });

  admin.patch("/returns/:id/refund", allowRoles("admin"), (req, res) => {
    const returnRequest = store.data.returns.find((entry) => entry.id === req.params.id);
    if (!returnRequest) return notFound(res, "Yêu cầu đổi trả");
    if (req.body.expectedVersion === undefined
      || Number(req.body.expectedVersion) !== Number(returnRequest.version || 1)) {
      return res.status(409).json({ message: "Yêu cầu vừa được cập nhật. Vui lòng tải lại trước khi hoàn tiền." });
    }
    if (returnRequest.status !== "completed" || returnRequest.type !== "return"
      || returnRequest.refundStatus !== "pending") {
      return res.status(409).json({ message: "Yêu cầu này chưa đủ điều kiện xác nhận hoàn tiền." });
    }
    const reference = String(req.body.reference || "").trim().slice(0, 160);
    const internalNote = String(req.body.internalNote || "").trim().slice(0, 1000);
    if (reference.length < 4 || internalNote.length < 5) {
      return res.status(400).json({ message: "Cần nhập mã giao dịch và nội dung đối soát hoàn tiền." });
    }
    const order = store.data.orders.find((entry) => entry.id === returnRequest.orderId);
    if (!order) return notFound(res, "Đơn hàng");
    const at = new Date().toISOString();
    returnRequest.refundStatus = "refunded";
    returnRequest.refundedAt = at;
    returnRequest.refundReference = reference;
    returnRequest.refundNote = internalNote;
    const eventAt = touchReturn(returnRequest, at);
    const event = appendReturnEvent(returnRequest, {
      status: "completed",
      label: "Đã hoàn tiền",
      note: `Đã hoàn ${Number(returnRequest.refundAmount || 0).toLocaleString("vi-VN")} ₫ cho khách hàng.`,
      internalNote,
      actor: req.user,
      source: "operations",
      at: eventAt,
    });
    const refundedAmount = store.data.returns
      .filter((entry) => entry.orderId === order.id && entry.refundStatus === "refunded")
      .reduce((sum, entry) => sum + Number(entry.refundAmount || 0), 0);
    order.refundedAmount = refundedAmount;
    const refundableProductTotal = Math.max(0, Number(order.subtotal || 0) - Number(order.discount || 0));
    order.paymentStatus = refundedAmount >= refundableProductTotal ? "refunded" : "partially_refunded";
    const orderAt = touchOrder(order, at);
    const paymentEvent = appendOrderEvent(order, {
      eventType: "payment",
      status: order.status,
      paymentStatus: order.paymentStatus,
      label: PAYMENT_STATUS_LABELS[order.paymentStatus],
      note: event.note,
      internalNote: `${internalNote} · Mã đối soát: ${reference}`,
      actor: req.user,
      source: "operations",
      at: orderAt,
    });
    notifyOrderChange(store, order, paymentEvent, { type: "payment_refunded", message: paymentEvent.note });
    notifyReturnChange(store, returnRequest, order, event);
    rebuildCustomerMetrics(store, order.customerId);
    store.audit("refund_completed", "return", returnRequest.id, req.user);
    store.save();
    queueOrderStatusEmail(order, paymentEvent);
    queueReturnStatusEmail(returnRequest, order, event);
    return res.json({ message: "Đã đối soát và xác nhận hoàn tiền.", data: returnRequest, order });
  });

  admin.get("/tasks", allowRoles("admin"), (_req, res) => {
    const data = store.data.tasks.map((task) => ({
      ...task,
      employee: store.data.employees.find((item) => item.id === task.employeeId) || null,
    })).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    return res.json({ data });
  });

  admin.post("/tasks", allowRoles("admin"), (req, res) => {
    const employee = store.data.employees.find((item) => item.id === req.body.employeeId && item.status === "active");
    const title = String(req.body.title || "").trim();
    const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : new Date();
    if (!employee || title.length < 3
      || !["low", "medium", "high"].includes(String(req.body.priority || "medium"))
      || Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ message: "Nhân viên, tiêu đề, mức ưu tiên hoặc hạn công việc chưa hợp lệ." });
    }
    const now = new Date().toISOString();
    const task = {
      id: store.nextId("tasks", "task-"), employeeId: employee.id, title,
      description: String(req.body.description || "").slice(0, 1000),
      priority: req.body.priority || "medium",
      status: "todo", dueDate: dueDate.toISOString(), createdAt: now, updatedAt: now,
    };
    store.data.tasks.push(task);
    store.audit("create", "task", task.id, req.user);
    store.save();
    return res.status(201).json({ message: "Đã giao công việc.", data: task });
  });

  admin.put("/tasks/:id", allowRoles("admin"), (req, res) => {
    const task = store.data.tasks.find((item) => item.id === req.params.id);
    if (!task) return notFound(res, "Công việc");
    const nextEmployeeId = String(req.body.employeeId ?? task.employeeId);
    const nextEmployee = store.data.employees.find((item) => item.id === nextEmployeeId && item.status === "active");
    const nextTitle = String(req.body.title ?? task.title).trim();
    const nextPriority = String(req.body.priority ?? task.priority ?? "medium");
    const nextStatus = String(req.body.status ?? task.status ?? "todo");
    const nextDueDate = new Date(req.body.dueDate ?? task.dueDate);
    if (!nextEmployee || nextTitle.length < 3
      || !["low", "medium", "high"].includes(nextPriority)
      || !["todo", "in_progress", "done"].includes(nextStatus)
      || Number.isNaN(nextDueDate.getTime())) {
      return res.status(400).json({ message: "Nhân viên, tiêu đề, trạng thái, mức ưu tiên hoặc hạn công việc chưa hợp lệ." });
    }
    task.title = nextTitle;
    task.description = String(req.body.description ?? task.description ?? "").slice(0, 1000);
    task.employeeId = nextEmployee.id;
    task.dueDate = nextDueDate.toISOString();
    task.priority = nextPriority;
    task.status = nextStatus;
    task.updatedAt = new Date().toISOString();
    store.audit("update", "task", task.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật công việc.", data: task });
  });

  admin.delete("/tasks/:id", allowRoles("admin"), (req, res) => {
    const before = store.data.tasks.length;
    store.data.tasks = store.data.tasks.filter((item) => item.id !== req.params.id);
    if (before === store.data.tasks.length) return notFound(res, "Công việc");
    store.audit("delete", "task", req.params.id, req.user);
    store.save();
    return res.json({ message: "Đã xóa công việc." });
  });

  admin.get("/suppliers", allowRoles("admin"), (_req, res) => res.json({ data: store.data.suppliers }));
  admin.post("/suppliers", allowRoles("admin"), (req, res) => {
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim();
    const email = normalizeText(req.body.email);
    const status = String(req.body.status || "active");
    if (name.length < 2
      || (phone && !phonePattern.test(phone))
      || (email && !emailPattern.test(email))
      || !["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Thông tin nhà cung cấp chưa hợp lệ." });
    }
    const supplier = {
      id: store.nextId("suppliers", "sup-"), name,
      contactName: String(req.body.contactName || ""), phone,
      email, address: String(req.body.address || ""),
      status,
      createdAt: new Date().toISOString(),
    };
    store.data.suppliers.push(supplier);
    store.audit("create", "supplier", supplier.id, req.user);
    store.save();
    return res.status(201).json({ message: "Đã thêm nhà cung cấp.", data: supplier });
  });

  admin.put("/suppliers/:id", allowRoles("admin"), (req, res) => {
    const supplier = store.data.suppliers.find((item) => item.id === req.params.id);
    if (!supplier) return notFound(res, "Nhà cung cấp");
    const nextName = String(req.body.name ?? supplier.name).trim();
    const nextPhone = String(req.body.phone ?? supplier.phone ?? "").trim();
    const nextEmail = normalizeText(req.body.email ?? supplier.email ?? "");
    const nextStatus = String(req.body.status ?? supplier.status ?? "active");
    if (nextName.length < 2
      || (nextPhone && !phonePattern.test(nextPhone))
      || (nextEmail && !emailPattern.test(nextEmail))
      || !["active", "inactive"].includes(nextStatus)) {
      return res.status(400).json({ message: "Thông tin nhà cung cấp chưa hợp lệ." });
    }
    supplier.name = nextName;
    supplier.phone = nextPhone;
    supplier.email = nextEmail;
    supplier.status = nextStatus;
    ["contactName", "address"].forEach((field) => {
      if (req.body[field] !== undefined) supplier[field] = String(req.body[field]);
    });
    store.audit("update", "supplier", supplier.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật nhà cung cấp.", data: supplier });
  });

  admin.get("/audit-logs", allowRoles("admin"), (_req, res) => {
    res.json({ data: store.data.auditLogs.slice(0, 100) });
  });

  app.use("/api/admin", admin);

  const staff = express.Router();
  staff.use(requireAuth, allowRoles("admin", "staff"));

  staff.get("/workspace", (req, res) => {
    const employee = store.data.employees.find((item) => item.id === req.user.employeeId);
    if (!employee) return notFound(res, "Hồ sơ nhân viên");
    const today = localDateKey();
    const attendance = store.data.attendance.find((item) => item.employeeId === employee.id && item.date === today) || null;
    const tasks = store.data.tasks
      .filter((item) => item.employeeId === employee.id)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const orderQueue = store.data.orders
      .filter((item) => item.assigneeId === employee.id || (!item.assigneeId && item.status === "pending"))
      .filter((item) => !["delivered", "cancelled"].includes(item.status))
      .slice(0, 8);
    const assignedOrders = orderQueue.filter((item) => item.assigneeId === employee.id).length;
    const availableOrders = orderQueue.filter((item) => !item.assigneeId).length;
    return res.json({
      data: {
        employee,
        attendance,
        tasks,
        orderQueue,
        summary: {
          openTasks: tasks.filter((item) => item.status !== "done").length,
          completedTasks: tasks.filter((item) => item.status === "done").length,
          assignedOrders,
          availableOrders,
          shift: employee.shift,
        },
      },
    });
  });

  staff.post("/attendance", (req, res) => {
    const employee = store.data.employees.find((item) => item.id === req.user.employeeId);
    if (!employee) return notFound(res, "Hồ sơ nhân viên");
    const today = localDateKey();
    const time = new Date().toLocaleTimeString("vi-VN", {
      timeZone: appTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    let attendance = store.data.attendance.find((item) => item.employeeId === employee.id && item.date === today);
    const action = req.body.action;
    if (action === "check_in") {
      if (attendance?.checkIn) return res.status(409).json({ message: "Bạn đã chấm công vào ca hôm nay." });
      attendance = attendance || { id: store.nextId("attendance", "att-"), employeeId: employee.id, date: today };
      attendance.checkIn = time;
      attendance.checkOut = null;
      attendance.status = "present";
      if (!store.data.attendance.includes(attendance)) store.data.attendance.push(attendance);
    } else if (action === "check_out") {
      if (!attendance?.checkIn) return res.status(409).json({ message: "Bạn chưa chấm công vào ca." });
      if (attendance.checkOut) return res.status(409).json({ message: "Bạn đã kết thúc ca hôm nay." });
      attendance.checkOut = time;
    } else {
      return res.status(400).json({ message: "Thao tác chấm công không hợp lệ." });
    }
    store.audit(action, "attendance", attendance.id, req.user);
    store.save();
    return res.json({ message: action === "check_in" ? "Đã ghi nhận vào ca." : "Đã ghi nhận kết thúc ca.", data: attendance });
  });

  staff.patch("/tasks/:id", (req, res) => {
    const task = store.data.tasks.find((item) => item.id === req.params.id);
    if (!task) return notFound(res, "Công việc");
    if (req.user.role !== "admin" && task.employeeId !== req.user.employeeId) {
      return res.status(403).json({ message: "Bạn không thể cập nhật công việc này." });
    }
    if (req.body.status !== undefined && !["todo", "in_progress", "done"].includes(req.body.status)) {
      return res.status(400).json({ message: "Trạng thái công việc không hợp lệ." });
    }
    if (req.body.title !== undefined && req.user.role === "admin") {
      const title = String(req.body.title).trim();
      if (title.length < 3) return res.status(400).json({ message: "Tiêu đề công việc cần ít nhất 3 ký tự." });
      task.title = title;
    }
    if (req.body.status !== undefined) task.status = req.body.status;
    task.updatedAt = new Date().toISOString();
    store.audit("update", "task", task.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật công việc.", data: task });
  });

  app.use("/api/staff", staff);

  app.get("/api/getallsp", (_req, res) => res.json(
    store.data.products
      .filter((item) => item.status === "active")
      .map((item) => publicProduct(item, store.data.categories)),
  ));
  app.get("/api/getsp/:id", (req, res) => {
    const product = store.data.products.find((item) => (
      item.status === "active"
      && (item.id === req.params.id || item.id.endsWith(String(req.params.id)))
    ));
    res.json(product ? [publicProduct(product, store.data.categories)] : []);
  });
  app.get("/api/getalldm", (_req, res) => res.json(
    store.data.categories.filter((item) => !item.status || item.status === "active"),
  ));
  app.get("/api/getalldonhang", requireAuth, allowRoles("admin", "staff"), (req, res) => {
    const orders = req.user.role === "staff"
      ? store.data.orders.filter((item) => !item.assigneeId || item.assigneeId === req.user.employeeId)
      : store.data.orders;
    return res.json(orders);
  });
  app.get("/api/getallnv", requireAuth, allowRoles("admin"), (_req, res) => res.json(store.data.employees));

  app.use((req, res) => {
    res.status(404).json({ message: "Đường dẫn API không tồn tại.", path: req.path });
  });

  app.use((error, req, res, _next) => {
    const status = error.status || (error.type === "entity.parse.failed" ? 400 : 500);
    if (process.env.NODE_ENV !== "test") {
      console.error(`[${req.requestId}]`, error);
    }
    res.status(status).json({
      message: status === 500 ? "Hệ thống đang bận. Vui lòng thử lại." : error.message,
      requestId: req.requestId,
    });
  });

  return app;
}

module.exports = { createApp };
