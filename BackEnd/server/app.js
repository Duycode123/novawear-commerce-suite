const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { JsonStore } = require("./lib/store");
const { hashPassword, verifyPassword, sanitizeUser } = require("./lib/security");

const ORDER_STATUS_LABELS = {
  pending: "Đã tiếp nhận",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  shipping: "Đang giao hàng",
  delivered: "Giao thành công",
  cancelled: "Đã hủy",
};

const ALLOWED_ORDER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packing", "cancelled"],
  packing: ["shipping", "cancelled"],
  shipping: ["delivered"],
  delivered: [],
  cancelled: [],
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+\s.-]{9,15}$/;

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
    { sub: user.id, role: user.role, email: user.email },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

function publicProduct(product, categories) {
  const category = categories.find((item) => item.id === product.categoryId);
  const { cost, ...safeProduct } = product;
  return {
    ...safeProduct,
    category: category ? { id: category.id, name: category.name, slug: category.slug, audience: category.audience || "all" } : null,
  };
}

function ratingStats(productId, reviews) {
  const published = reviews.filter((item) => item.productId === productId && item.status === "published");
  if (!published.length) return { rating: 0, reviewCount: 0 };
  const average = published.reduce((sum, item) => sum + Number(item.rating || 0), 0) / published.length;
  return { rating: Math.round(average * 10) / 10, reviewCount: published.length };
}

function createApp(options = {}) {
  const app = express();
  const dataFile = options.dataFile
    || process.env.DATA_FILE
    || path.join(__dirname, "data", "store.json");
  const store = options.store || new JsonStore(dataFile);
  const jwtSecret = process.env.JWT_SECRET || "novawear-local-development-secret-change-me";
  const sepayWebhookApiKey = String(options.sepayWebhookApiKey || process.env.SEPAY_WEBHOOK_API_KEY || "").trim();
  const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const authAttempts = new Map();

  app.locals.store = store;

  app.disable("x-powered-by");
  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
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
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  function optionalAuth(req, _res, next) {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) {
      req.user = null;
      next();
      return;
    }

    try {
      const payload = jwt.verify(token, jwtSecret);
      const user = store.data.users.find((item) => item.id === payload.sub);
      req.user = user && user.status === "active" ? sanitizeUser(user) : null;
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
      next();
    };
  }

  function rateLimitAuth(req, res, next) {
    const key = `${req.ip}:${normalizeText(req.body?.email)}`;
    const current = authAttempts.get(key);
    const timestamp = Date.now();
    if (current && current.blockedUntil > timestamp) {
      const seconds = Math.ceil((current.blockedUntil - timestamp) / 1000);
      res.status(429).json({ message: `Vui lòng thử lại sau ${seconds} giây.` });
      return;
    }
    req.authAttemptKey = key;
    next();
  }

  function recordAuthFailure(key) {
    if (!key) return;
    const current = authAttempts.get(key) || { count: 0, blockedUntil: 0 };
    current.count += 1;
    if (current.count >= 5) {
      current.blockedUntil = Date.now() + 60_000;
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

  function registerHandler(req, res) {
    const name = String(req.body.name || req.body.ten_nguoi_dung || "").trim();
    const email = normalizeText(req.body.email);
    const phone = String(req.body.phone || req.body.sdt || "").trim();
    const password = String(req.body.password || req.body.mat_khau || "");

    if (name.length < 2) return res.status(400).json({ message: "Họ tên cần có ít nhất 2 ký tự." });
    if (!emailPattern.test(email)) return res.status(400).json({ message: "Email chưa đúng định dạng." });
    if (!phonePattern.test(phone)) return res.status(400).json({ message: "Số điện thoại chưa đúng định dạng." });
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: "Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số." });
    }
    if (store.data.users.some((user) => normalizeText(user.email) === email)) {
      return res.status(409).json({ message: "Email này đã được sử dụng." });
    }

    const customerId = store.nextId("customers", "cus-");
    const userId = store.nextId("users", "usr-");
    const createdAt = new Date().toISOString();
    const customer = {
      id: customerId,
      name,
      email,
      phone,
      address: "",
      tier: "Member",
      totalSpent: 0,
      orderCount: 0,
      status: "active",
      createdAt,
    };
    const user = {
      id: userId,
      name,
      email,
      phone,
      role: "customer",
      customerId,
      employeeId: null,
      status: "active",
      passwordHash: hashPassword(password),
      createdAt,
    };

    store.data.customers.push(customer);
    store.data.users.push(user);
    store.audit("create", "user", user.id, sanitizeUser(user));
    store.save();
    clearAuthFailures(req.authAttemptKey);

    return res.status(201).json({
      message: "Tạo tài khoản thành công.",
      token: createToken(user, jwtSecret),
      user: sanitizeUser(user),
    });
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
    if (!user || !verifyPassword(password, user.passwordHash)) {
      recordAuthFailure(req.authAttemptKey);
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
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
    return res.json({
      message: "Đăng nhập thành công.",
      token: createToken(user, jwtSecret),
      user: sanitizeUser(user),
    });
  }

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "novawear-api",
      version: store.data.meta?.version || 1,
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
    });
  });

  app.post("/api/auth/register", rateLimitAuth, registerHandler);
  app.post("/api/auth/login", rateLimitAuth, loginHandler);
  app.post("/api/createaccount", rateLimitAuth, registerHandler);
  app.post("/api/login", rateLimitAuth, loginHandler);

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = store.data.users.find((item) => item.id === req.user.id);
    const customer = user.customerId
      ? store.data.customers.find((item) => item.id === user.customerId)
      : null;
    const employee = user.employeeId
      ? store.data.employees.find((item) => item.id === user.employeeId)
      : null;
    res.json({ user: sanitizeUser(user), customer, employee });
  });

  app.put("/api/auth/me", requireAuth, (req, res) => {
    const user = store.data.users.find((item) => item.id === req.user.id);
    const name = String(req.body.name || user.name).trim();
    const phone = String(req.body.phone || user.phone).trim();
    const address = String(req.body.address || "").trim();

    if (name.length < 2) return res.status(400).json({ message: "Họ tên chưa hợp lệ." });
    if (!phonePattern.test(phone)) return res.status(400).json({ message: "Số điện thoại chưa hợp lệ." });

    user.name = name;
    user.phone = phone;
    if (user.customerId) {
      const customer = store.data.customers.find((item) => item.id === user.customerId);
      if (customer) Object.assign(customer, { name, phone, address: address || customer.address });
    }
    if (user.employeeId) {
      const employee = store.data.employees.find((item) => item.id === user.employeeId);
      if (employee) Object.assign(employee, { name, phone, address: address || employee.address });
    }
    store.audit("update", "user", user.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật hồ sơ.", user: sanitizeUser(user) });
  });

  app.put("/api/auth/password", requireAuth, (req, res) => {
    const user = store.data.users.find((item) => item.id === req.user.id);
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng." });
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({ message: "Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ và số." });
    }
    user.passwordHash = hashPassword(newPassword);
    store.audit("update_password", "user", user.id, req.user);
    store.save();
    return res.json({ message: "Đổi mật khẩu thành công." });
  });

  app.get("/api/categories", (_req, res) => {
    const categories = store.data.categories
      .filter((item) => item.status !== "archived")
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
      status = "active",
    } = req.query;
    const page = asPositiveInt(req.query.page, 1);
    const limit = Math.min(asPositiveInt(req.query.limit || req.query.pageSize, 12), 100);
    const searchText = normalizeText(search || req.query.keyword);
    const categoryText = normalizeText(category);
    const audienceText = normalizeText(audience);
    const colorText = normalizeText(color);
    const sizeText = normalizeText(size);
    let products = store.data.products.map((item) => ({ ...item, ...ratingStats(item.id, store.data.reviews) }));

    if (status !== "all") products = products.filter((item) => item.status === status);
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

    const sorters = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
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
      .map((item) => publicProduct(item, store.data.categories));

    res.json({
      data,
      pagination: { page: safePage, limit, total, totalPages },
    });
  });

  app.get("/api/products/:identifier", (req, res) => {
    const product = store.data.products.find(
      (item) => item.id === req.params.identifier || item.slug === req.params.identifier,
    );
    if (!product || product.status === "archived") return notFound(res, "Sản phẩm");
    const productWithRating = { ...product, ...ratingStats(product.id, store.data.reviews) };
    const related = store.data.products
      .filter((item) => item.id !== product.id && item.categoryId === product.categoryId && item.status === "active")
      .slice(0, 4)
      .map((item) => publicProduct({ ...item, ...ratingStats(item.id, store.data.reviews) }, store.data.categories));
    const reviews = store.data.reviews
      .filter((item) => item.productId === product.id && item.status === "published")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({
      data: publicProduct(productWithRating, store.data.categories),
      related,
      reviews,
    });
  });

  app.post("/api/products/:productId/reviews", requireAuth, (req, res) => {
    const product = store.data.products.find((item) => item.id === req.params.productId);
    if (!product) return notFound(res, "Sản phẩm");
    const rating = Number(req.body.rating);
    const content = String(req.body.content || "").trim();
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

  app.get("/api/products/:productId/review-eligibility", requireAuth, (req, res) => {
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
    const now = new Date();
    const data = (store.data.coupons || [])
      .filter((item) => item.active && new Date(item.expiresAt) >= now)
      .map(({ code, type, value, minOrder, maxDiscount, expiresAt }) => ({ code, type, value, minOrder, maxDiscount, expiresAt }));
    return res.json({ data });
  });

  app.get("/api/news", (_req, res) => {
    const data = (store.data.news || []).filter((item) => item.status === "published").sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return res.json({ data });
  });
  app.get("/api/news/:id", (req, res) => {
    const article = (store.data.news || []).find((item) => item.id === req.params.id && item.status === "published");
    if (!article) return notFound(res, "Bài viết");
    const published = (store.data.news || []).filter((item) => item.status === "published").sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return res.json({ data: article, related: published.filter((item) => item.id !== article.id).slice(0, 3) });
  });

  app.post("/api/coupons/validate", (req, res) => {
    const code = String(req.body.code || "").trim().toUpperCase();
    const subtotal = asMoney(req.body.subtotal);
    const coupon = store.data.coupons.find((item) => item.code === code && item.active);
    if (!coupon || new Date(coupon.expiresAt) < new Date()) {
      return res.status(404).json({ message: "Mã ưu đãi không tồn tại hoặc đã hết hạn." });
    }
    if (subtotal < coupon.minOrder) {
      return res.status(400).json({ message: `Đơn hàng cần tối thiểu ${coupon.minOrder.toLocaleString("vi-VN")}đ để dùng mã này.` });
    }
    let discount = 0;
    if (coupon.type === "percent") discount = Math.min(Math.round(subtotal * coupon.value / 100), coupon.maxDiscount);
    if (coupon.type === "fixed") discount = Math.min(coupon.value, coupon.maxDiscount || coupon.value);
    return res.json({ data: { code: coupon.code, type: coupon.type, discount, shippingDiscount: coupon.type === "shipping" ? coupon.value : 0 } });
  });

  app.post("/api/payments/sepay/webhook", (req, res) => {
    if (!sepayWebhookApiKey) {
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
      if (item.paymentProvider !== "sepay" || item.paymentStatus === "paid") return false;
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
      order.paymentStatus = "paid";
      order.paidAt = receivedAt;
      order.updatedAt = receivedAt;
      order.paymentTransaction = transaction;
      if (order.status === "pending") {
        order.status = "confirmed";
        order.timeline.push({ status: "confirmed", label: ORDER_STATUS_LABELS.confirmed, at: receivedAt });
      }
      store.audit("payment_confirmed", "order", order.id, { name: "SePay" });
    } else {
      store.audit("payment_unmatched", "payment", transactionId, { name: "SePay" });
    }
    store.save();

    return res.status(200).json({ success: true, matched: Boolean(order), orderId: order?.id || null });
  });

  app.get("/api/payments/sepay/orders/:id/status", (req, res) => {
    const order = store.data.orders.find((item) => item.id === req.params.id);
    const trackingCode = normalizePaymentCode(req.query.trackingCode);
    if (!order || !trackingCode || trackingCode !== normalizePaymentCode(order.trackingCode)) {
      return notFound(res, "Payment");
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

  app.post("/api/orders", optionalAuth, (req, res) => {
    const customer = {
      name: String(req.body.customer?.name || "").trim(),
      email: normalizeText(req.body.customer?.email),
      phone: String(req.body.customer?.phone || "").trim(),
      address: String(req.body.customer?.address || "").trim(),
    };
    const validationError = validateCustomer(customer);
    if (validationError) return res.status(400).json({ message: validationError });
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
      const size = String(requested.size || product.sizes?.[0] || "");
      const color = String(requested.color || product.colors?.[0] || "");
      if (product.sizes?.length && !product.sizes.includes(size)) {
        return res.status(400).json({ message: `Kích thước của ${product.name} chưa hợp lệ.` });
      }
      if (product.colors?.length && !product.colors.includes(color)) {
        return res.status(400).json({ message: `Màu của ${product.name} chưa hợp lệ.` });
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

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingMethod = req.body.shippingMethod === "express" ? "express" : "standard";
    let shippingFee = shippingMethod === "express" ? 60000 : (subtotal >= 699000 ? 0 : 30000);
    let discount = 0;
    let couponCode = "";
    if (req.body.couponCode) {
      const code = String(req.body.couponCode).trim().toUpperCase();
      const coupon = store.data.coupons.find(
        (item) => item.code === code && item.active && new Date(item.expiresAt) >= new Date(),
      );
      if (!coupon || subtotal < coupon.minOrder) {
        return res.status(400).json({ message: "Mã ưu đãi không còn hợp lệ với đơn hàng này." });
      }
      couponCode = coupon.code;
      if (coupon.type === "percent") discount = Math.min(Math.round(subtotal * coupon.value / 100), coupon.maxDiscount);
      if (coupon.type === "fixed") discount = Math.min(coupon.value, coupon.maxDiscount || coupon.value);
      if (coupon.type === "shipping") shippingFee = Math.max(0, shippingFee - coupon.value);
    }

    const orderNumber = store.data.orders.reduce((max, item) => {
      const match = item.id.match(/(\d+)$/);
      return Math.max(max, match ? Number(match[1]) : 0);
    }, 0) + 1;
    const year = new Date().getFullYear();
    const id = `ORD-${year}-${String(orderNumber).padStart(3, "0")}`;
    const trackingCode = `NVA${String(year).slice(-2)}${String(orderNumber).padStart(4, "0")}`;
    const createdAt = new Date().toISOString();
    const paymentMethod = ["cod", "bank", "wallet"].includes(req.body.paymentMethod)
      ? req.body.paymentMethod
      : "cod";

    let customerRecord = null;
    if (req.user?.customerId) {
      customerRecord = store.data.customers.find((item) => item.id === req.user.customerId);
    }
    if (!customerRecord && customer.email) {
      customerRecord = store.data.customers.find((item) => normalizeText(item.email) === customer.email);
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
    } else {
      Object.assign(customerRecord, customer);
    }

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
      total: subtotal + shippingFee - discount,
      couponCode,
      shippingMethod,
      paymentMethod,
      paymentProvider: paymentMethod === "bank" ? "sepay" : null,
      paymentCode: paymentMethod === "bank" ? trackingCode : null,
      paymentStatus: paymentMethod === "cod" ? "pending" : "awaiting",
      status: "pending",
      note: String(req.body.note || "").trim().slice(0, 500),
      assigneeId: null,
      timeline: [{ status: "pending", label: ORDER_STATUS_LABELS.pending, at: createdAt }],
      createdAt,
      updatedAt: createdAt,
    };

    for (const line of items) {
      const product = store.data.products.find((item) => item.id === line.productId);
      product.stock -= line.quantity;
      product.sold += line.quantity;
    }
    customerRecord.totalSpent = asMoney(customerRecord.totalSpent) + order.total;
    customerRecord.orderCount = Number(customerRecord.orderCount || 0) + 1;
    if (customerRecord.totalSpent >= 5000000) customerRecord.tier = "Gold";
    else if (customerRecord.totalSpent >= 2000000) customerRecord.tier = "Silver";
    store.data.orders.unshift(order);
    store.audit("create", "order", order.id, req.user || { name: customer.name });
    store.save();

    return res.status(201).json({
      message: "Đặt hàng thành công.",
      data: order,
    });
  });

  app.get("/api/orders/my", requireAuth, (req, res) => {
    const orders = store.data.orders
      .filter((item) => item.userId === req.user.id || item.customerId === req.user.customerId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ data: orders });
  });

  app.get("/api/orders/track/:trackingCode", (req, res) => {
    const phone = String(req.query.phone || "").replace(/\s/g, "");
    const order = store.data.orders.find(
      (item) => normalizeText(item.trackingCode) === normalizeText(req.params.trackingCode),
    );
    if (!order || (phone && order.customer.phone.replace(/\s/g, "") !== phone)) {
      return notFound(res, "Đơn hàng");
    }
    const { customer, ...safeOrder } = order;
    return res.json({
      data: {
        ...safeOrder,
        customer: { name: customer.name, address: customer.address, phone: customer.phone.replace(/.(?=.{4})/g, "•") },
      },
    });
  });

  app.get("/api/orders/:id", requireAuth, (req, res) => {
    const order = store.data.orders.find((item) => item.id === req.params.id);
    if (!order) return notFound(res, "Đơn hàng");
    const isTeam = ["admin", "staff"].includes(req.user.role);
    if (!isTeam && order.userId !== req.user.id && order.customerId !== req.user.customerId) {
      return res.status(403).json({ message: "Bạn không thể xem đơn hàng này." });
    }
    return res.json({ data: order });
  });

  app.patch("/api/orders/:id/cancel", requireAuth, (req, res) => {
    const order = store.data.orders.find((item) => item.id === req.params.id);
    if (!order) return notFound(res, "Đơn hàng");
    const isTeam = ["admin", "staff"].includes(req.user.role);
    if (!isTeam && order.userId !== req.user.id && order.customerId !== req.user.customerId) {
      return res.status(403).json({ message: "Bạn không thể hủy đơn hàng này." });
    }
    if (!["pending", "confirmed"].includes(order.status)) {
      return res.status(409).json({ message: "Đơn hàng đã được xử lý nên không thể hủy trực tuyến." });
    }
    order.status = "cancelled";
    order.updatedAt = new Date().toISOString();
    order.timeline.push({ status: "cancelled", label: ORDER_STATUS_LABELS.cancelled, at: order.updatedAt });
    for (const line of order.items) {
      const product = store.data.products.find((item) => item.id === line.productId);
      if (product) {
        product.stock += line.quantity;
        product.sold = Math.max(0, product.sold - line.quantity);
      }
    }
    store.audit("cancel", "order", order.id, req.user);
    store.save();
    return res.json({ message: "Đã hủy đơn hàng.", data: order });
  });

  app.post("/api/contact", (req, res) => {
    const name = String(req.body.name || "").trim();
    const email = normalizeText(req.body.email);
    const message = String(req.body.message || "").trim();
    if (name.length < 2 || !emailPattern.test(email) || message.length < 10) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ họ tên, email và nội dung." });
    }
    const contact = {
      id: store.nextId("contacts", "msg-"),
      name,
      email,
      phone: String(req.body.phone || "").trim(),
      subject: String(req.body.subject || "Yêu cầu hỗ trợ").trim(),
      message: message.slice(0, 2000),
      status: "new",
      createdAt: new Date().toISOString(),
    };
    store.data.contacts.unshift(contact);
    store.save();
    return res.status(201).json({ message: "NOVAWEAR đã nhận được lời nhắn của bạn." });
  });

  app.post("/api/newsletter", (req, res) => {
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

  admin.get("/overview", (_req, res) => {
    const activeOrders = store.data.orders.filter((item) => item.status !== "cancelled");
    const today = new Date().toISOString().slice(0, 10);
    const revenue = activeOrders.reduce((sum, item) => sum + item.total, 0);
    const todayRevenue = activeOrders
      .filter((item) => item.createdAt.slice(0, 10) === today)
      .reduce((sum, item) => sum + item.total, 0);
    const revenueByDay = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        date: key,
        label: date.toLocaleDateString("vi-VN", { weekday: "short" }),
        value: activeOrders
          .filter((item) => item.createdAt.slice(0, 10) === key)
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
    let items = [...store.data.products];
    if (search) items = items.filter((item) => normalizeText(`${item.name} ${item.sku}`).includes(search));
    if (categoryId) items = items.filter((item) => item.categoryId === categoryId);
    if (status !== "all") items = items.filter((item) => item.status === status);
    res.json({ data: items.map((item) => ({ ...item, category: store.data.categories.find((cat) => cat.id === item.categoryId) || null })) });
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
    const product = {
      id: store.nextId("products", "prd-"),
      sku,
      name,
      slug: slugify(req.body.slug || name),
      categoryId,
      price: asMoney(req.body.price),
      comparePrice: asMoney(req.body.comparePrice),
      saleEndsAt: req.body.saleEndsAt ? new Date(req.body.saleEndsAt).toISOString() : "",
      cost: asMoney(req.body.cost),
      stock: asMoney(req.body.stock),
      status: ["active", "draft", "archived"].includes(req.body.status) ? req.body.status : "draft",
      featured: Boolean(req.body.featured),
      badge: String(req.body.badge || ""),
      audience: ["men", "women", "unisex"].includes(req.body.audience) ? req.body.audience : "unisex",
      image: String(req.body.image || "/Images/11-0_672x990.jpg"),
      images: Array.isArray(req.body.images) && req.body.images.length ? req.body.images : [String(req.body.image || "/Images/11-0_672x990.jpg")],
      colors: Array.isArray(req.body.colors) ? req.body.colors : String(req.body.colors || "").split(",").map((item) => item.trim()).filter(Boolean),
      sizes: Array.isArray(req.body.sizes) ? req.body.sizes : String(req.body.sizes || "").split(",").map((item) => item.trim()).filter(Boolean),
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
    store.audit("create", "product", product.id, req.user);
    store.save();
    return res.status(201).json({ message: "Đã tạo sản phẩm.", data: product });
  });

  admin.put("/products/:id", (req, res) => {
    const product = store.data.products.find((item) => item.id === req.params.id);
    if (!product) return notFound(res, "Sản phẩm");
    const allowed = ["name", "sku", "categoryId", "price", "comparePrice", "saleEndsAt", "cost", "stock", "status", "featured", "badge", "audience", "image", "images", "colors", "sizes", "description", "longDescription", "materials", "care", "fit", "suitableFor", "modelInfo", "origin", "highlights", "featureDetails"];
    for (const field of allowed) {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    }
    product.name = String(product.name || "").trim();
    product.sku = String(product.sku || "").trim().toUpperCase();
    product.slug = slugify(req.body.slug || product.name);
    ["price", "comparePrice", "cost", "stock"].forEach((field) => { product[field] = asMoney(product[field]); });
    if (!product.name || !product.sku) return res.status(400).json({ message: "Tên và SKU là bắt buộc." });
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

  admin.get("/news", (_req, res) => res.json({ data: store.data.news || [] }));
  admin.post("/news", allowRoles("admin"), (req, res) => {
    const title = String(req.body.title || "").trim();
    if (title.length < 5) return res.status(400).json({ message: "Tiêu đề bài viết cần ít nhất 5 ký tự." });
    const article = { id: store.nextId("news", "news-"), title, excerpt: String(req.body.excerpt || ""), content: String(req.body.content || ""), category: String(req.body.category || "NOVA Journal"), image: String(req.body.image || "/Images/nova-v3/home-story.png"), status: req.body.status === "draft" ? "draft" : "published", publishedAt: req.body.publishedAt || new Date().toISOString() };
    store.data.news = store.data.news || [];
    store.data.news.push(article);
    store.audit("create", "news", article.id, req.user);
    store.save();
    return res.status(201).json({ message: "Đã tạo bài viết.", data: article });
  });
  admin.put("/news/:id", allowRoles("admin"), (req, res) => {
    const article = (store.data.news || []).find((item) => item.id === req.params.id);
    if (!article) return notFound(res, "Bài viết");
    ["title", "excerpt", "content", "category", "image", "status", "publishedAt"].forEach((field) => { if (req.body[field] !== undefined) article[field] = String(req.body[field]); });
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

  admin.get("/coupons", (_req, res) => res.json({ data: store.data.coupons || [] }));
  admin.post("/coupons", allowRoles("admin"), (req, res) => {
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return res.status(400).json({ message: "Mã ưu đãi chưa hợp lệ." });
    if ((store.data.coupons || []).some((item) => item.code === code)) return res.status(409).json({ message: "Mã ưu đãi đã tồn tại." });
    const coupon = { code, type: ["percent", "fixed", "shipping"].includes(req.body.type) ? req.body.type : "percent", value: asMoney(req.body.value), minOrder: asMoney(req.body.minOrder), maxDiscount: asMoney(req.body.maxDiscount), active: req.body.active !== false, expiresAt: req.body.expiresAt || new Date(Date.now() + 30 * 86400000).toISOString() };
    store.data.coupons = store.data.coupons || []; store.data.coupons.push(coupon); store.audit("create", "coupon", code, req.user); store.save(); return res.status(201).json({ message: "Đã thêm mã ưu đãi.", data: coupon });
  });
  admin.put("/coupons/:code", allowRoles("admin"), (req, res) => { const coupon = (store.data.coupons || []).find((item) => item.code === req.params.code); if (!coupon) return notFound(res, "Mã ưu đãi"); ["type", "value", "minOrder", "maxDiscount", "active", "expiresAt"].forEach((field) => { if (req.body[field] !== undefined) coupon[field] = ["value", "minOrder", "maxDiscount"].includes(field) ? asMoney(req.body[field]) : req.body[field]; }); store.audit("update", "coupon", coupon.code, req.user); store.save(); return res.json({ message: "Đã cập nhật mã ưu đãi.", data: coupon }); });
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
    if (req.body.name !== undefined) category.name = String(req.body.name).trim();
    if (req.body.description !== undefined) category.description = String(req.body.description);
    if (req.body.audience !== undefined && ["men", "women", "all"].includes(String(req.body.audience))) category.audience = String(req.body.audience);
    if (req.body.status !== undefined) category.status = String(req.body.status);
    category.slug = slugify(req.body.slug || category.name);
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
    const search = normalizeText(req.query.search);
    const status = String(req.query.status || "all");
    let orders = [...store.data.orders];
    if (status !== "all") orders = orders.filter((item) => item.status === status);
    if (search) {
      orders = orders.filter((item) => normalizeText(`${item.id} ${item.trackingCode} ${item.customer.name} ${item.customer.phone}`).includes(search));
    }
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ data: orders });
  });

  admin.get("/orders/:id", (req, res) => {
    const order = store.data.orders.find((item) => item.id === req.params.id);
    if (!order) return notFound(res, "Đơn hàng");
    return res.json({ data: order });
  });

  admin.patch("/orders/:id", (req, res) => {
    const order = store.data.orders.find((item) => item.id === req.params.id);
    if (!order) return notFound(res, "Đơn hàng");
    const nextStatus = req.body.status;
    if (nextStatus && nextStatus !== order.status) {
      const allowed = ALLOWED_ORDER_TRANSITIONS[order.status] || [];
      if (!allowed.includes(nextStatus) && req.user.role !== "admin") {
        return res.status(409).json({ message: "Không thể chuyển sang trạng thái đã chọn." });
      }
      if (!ORDER_STATUS_LABELS[nextStatus]) return res.status(400).json({ message: "Trạng thái không hợp lệ." });
      if (nextStatus === "cancelled" && order.status !== "cancelled") {
        for (const line of order.items) {
          const product = store.data.products.find((item) => item.id === line.productId);
          if (product) {
            product.stock += line.quantity;
            product.sold = Math.max(0, product.sold - line.quantity);
          }
        }
      }
      order.status = nextStatus;
      order.timeline.push({ status: nextStatus, label: ORDER_STATUS_LABELS[nextStatus], at: new Date().toISOString() });
      if (nextStatus === "delivered" && order.paymentMethod === "cod") order.paymentStatus = "paid";
    }
    if (req.body.paymentStatus && ["pending", "awaiting", "paid", "refunded", "failed"].includes(req.body.paymentStatus)) {
      order.paymentStatus = req.body.paymentStatus;
    }
    if (req.body.assigneeId !== undefined) {
      const assignee = store.data.employees.find((item) => item.id === req.body.assigneeId && item.status === "active");
      order.assigneeId = assignee ? assignee.id : null;
    }
    if (req.body.note !== undefined) order.internalNote = String(req.body.note).slice(0, 500);
    order.updatedAt = new Date().toISOString();
    store.audit("update", "order", order.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật đơn hàng.", data: order });
  });

  admin.get("/customers", (req, res) => {
    const search = normalizeText(req.query.search);
    let customers = [...store.data.customers];
    if (search) customers = customers.filter((item) => normalizeText(`${item.name} ${item.email} ${item.phone}`).includes(search));
    customers.sort((a, b) => b.totalSpent - a.totalSpent);
    res.json({ data: customers });
  });

  admin.post("/customers", (req, res) => {
    const customer = {
      id: store.nextId("customers", "cus-"),
      name: String(req.body.name || "").trim(),
      email: normalizeText(req.body.email),
      phone: String(req.body.phone || "").trim(),
      address: String(req.body.address || "").trim(),
      tier: req.body.tier || "Member",
      totalSpent: 0,
      orderCount: 0,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    if (customer.name.length < 2 || !phonePattern.test(customer.phone) || (customer.email && !emailPattern.test(customer.email))) {
      return res.status(400).json({ message: "Thông tin khách hàng chưa hợp lệ." });
    }
    store.data.customers.push(customer);
    store.audit("create", "customer", customer.id, req.user);
    store.save();
    return res.status(201).json({ message: "Đã thêm khách hàng.", data: customer });
  });

  admin.put("/customers/:id", (req, res) => {
    const customer = store.data.customers.find((item) => item.id === req.params.id);
    if (!customer) return notFound(res, "Khách hàng");
    ["name", "email", "phone", "address", "tier", "status"].forEach((field) => {
      if (req.body[field] !== undefined) customer[field] = String(req.body[field]).trim();
    });
    if (!customer.name || !phonePattern.test(customer.phone) || (customer.email && !emailPattern.test(customer.email))) {
      return res.status(400).json({ message: "Thông tin khách hàng chưa hợp lệ." });
    }
    store.audit("update", "customer", customer.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật khách hàng.", data: customer });
  });

  admin.get("/employees", (req, res) => {
    const search = normalizeText(req.query.search);
    const department = String(req.query.department || "");
    let employees = [...store.data.employees];
    if (search) employees = employees.filter((item) => normalizeText(`${item.name} ${item.employeeCode} ${item.email} ${item.phone}`).includes(search));
    if (department) employees = employees.filter((item) => item.department === department);
    res.json({ data: employees });
  });

  admin.post("/employees", allowRoles("admin"), (req, res) => {
    const email = normalizeText(req.body.email);
    if (!emailPattern.test(email) || store.data.employees.some((item) => normalizeText(item.email) === email)) {
      return res.status(409).json({ message: "Email nhân viên chưa hợp lệ hoặc đã tồn tại." });
    }
    const employee = {
      id: store.nextId("employees", "emp-"),
      employeeCode: `NV${String(store.data.employees.length + 1).padStart(3, "0")}`,
      name: String(req.body.name || "").trim(),
      email,
      phone: String(req.body.phone || "").trim(),
      roleTitle: String(req.body.roleTitle || "Nhân viên"),
      department: String(req.body.department || "Bán hàng"),
      status: req.body.status || "active",
      joinDate: req.body.joinDate || new Date().toISOString().slice(0, 10),
      shift: String(req.body.shift || "09:00 - 18:00"),
      performance: asMoney(req.body.performance || 80),
      address: String(req.body.address || ""),
      avatar: String(req.body.avatar || ""),
    };
    if (employee.name.length < 2 || !phonePattern.test(employee.phone)) {
      return res.status(400).json({ message: "Họ tên hoặc số điện thoại chưa hợp lệ." });
    }
    store.data.employees.push(employee);
    if (req.body.createAccount) {
      const temporaryPassword = String(req.body.temporaryPassword || "Welcome@123");
      store.data.users.push({
        id: store.nextId("users", "usr-"),
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: req.body.accountRole === "admin" ? "admin" : "staff",
        employeeId: employee.id,
        customerId: null,
        status: "active",
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
    ["name", "email", "phone", "roleTitle", "department", "status", "joinDate", "shift", "performance", "address", "avatar"].forEach((field) => {
      if (req.body[field] !== undefined) employee[field] = req.body[field];
    });
    employee.performance = Math.min(100, Math.max(0, asMoney(employee.performance)));
    store.audit("update", "employee", employee.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật nhân viên.", data: employee });
  });

  admin.delete("/employees/:id", allowRoles("admin"), (req, res) => {
    const employee = store.data.employees.find((item) => item.id === req.params.id);
    if (!employee) return notFound(res, "Nhân viên");
    employee.status = "inactive";
    const user = store.data.users.find((item) => item.employeeId === employee.id);
    if (user) user.status = "inactive";
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
    if (req.body.status && ["active", "inactive"].includes(req.body.status)) user.status = req.body.status;
    if (req.body.role && ["admin", "staff", "customer"].includes(req.body.role)) user.role = req.body.role;
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
        cost: item.cost,
        retailValue: item.price * item.stock,
        status: item.stock === 0 ? "out" : item.stock <= 20 ? "low" : "healthy",
      })),
    });
  });

  admin.post("/inventory/adjust", (req, res) => {
    const product = store.data.products.find((item) => item.id === req.body.productId);
    if (!product) return notFound(res, "Sản phẩm");
    const quantity = Number.parseInt(req.body.quantity, 10);
    if (!Number.isFinite(quantity) || quantity === 0 || product.stock + quantity < 0) {
      return res.status(400).json({ message: "Số lượng điều chỉnh không hợp lệ." });
    }
    const before = product.stock;
    product.stock += quantity;
    store.audit(`${quantity > 0 ? "increase" : "decrease"}_stock:${before}->${product.stock}`, "product", product.id, req.user);
    store.save();
    return res.json({ message: "Đã điều chỉnh tồn kho.", data: product });
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

  admin.post("/purchase-orders", (req, res) => {
    const supplier = String(req.body.supplier || "").trim();
    if (!supplier || !Array.isArray(req.body.items) || !req.body.items.length) {
      return res.status(400).json({ message: "Nhà cung cấp và danh sách nhập hàng là bắt buộc." });
    }
    const items = [];
    for (const line of req.body.items) {
      const product = store.data.products.find((item) => item.id === line.productId);
      if (!product) return res.status(400).json({ message: "Sản phẩm nhập kho không tồn tại." });
      items.push({ productId: product.id, quantity: asPositiveInt(line.quantity), unitCost: asMoney(line.unitCost || product.cost) });
    }
    const purchaseOrder = {
      id: `PO-${new Date().getFullYear()}-${String(store.data.purchaseOrders.length + 1).padStart(3, "0")}`,
      supplier,
      expectedDate: req.body.expectedDate || null,
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

  admin.patch("/purchase-orders/:id/receive", (req, res) => {
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

  admin.get("/contacts", (_req, res) => {
    res.json({ data: [...store.data.contacts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  });

  admin.patch("/contacts/:id", (req, res) => {
    const contact = store.data.contacts.find((item) => item.id === req.params.id);
    if (!contact) return notFound(res, "Yêu cầu hỗ trợ");
    if (["new", "in_progress", "resolved"].includes(req.body.status)) contact.status = req.body.status;
    contact.assigneeId = req.user.id;
    store.save();
    return res.json({ message: "Đã cập nhật yêu cầu hỗ trợ.", data: contact });
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
    const today = new Date().toISOString().slice(0, 10);
    const attendance = store.data.attendance.find((item) => item.employeeId === employee.id && item.date === today) || null;
    const tasks = store.data.tasks
      .filter((item) => item.employeeId === employee.id)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const orderQueue = store.data.orders
      .filter((item) => item.assigneeId === employee.id || (!item.assigneeId && item.status === "pending"))
      .filter((item) => !["delivered", "cancelled"].includes(item.status))
      .slice(0, 8);
    return res.json({
      data: {
        employee,
        attendance,
        tasks,
        orderQueue,
        summary: {
          openTasks: tasks.filter((item) => item.status !== "done").length,
          completedTasks: tasks.filter((item) => item.status === "done").length,
          assignedOrders: orderQueue.length,
          shift: employee.shift,
        },
      },
    });
  });

  staff.post("/attendance", (req, res) => {
    const employee = store.data.employees.find((item) => item.id === req.user.employeeId);
    if (!employee) return notFound(res, "Hồ sơ nhân viên");
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
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
    if (["todo", "in_progress", "done"].includes(req.body.status)) task.status = req.body.status;
    if (req.body.title && req.user.role === "admin") task.title = String(req.body.title).trim();
    task.updatedAt = new Date().toISOString();
    store.audit("update", "task", task.id, req.user);
    store.save();
    return res.json({ message: "Đã cập nhật công việc.", data: task });
  });

  app.use("/api/staff", staff);

  app.get("/api/getallsp", (_req, res) => res.json(store.data.products));
  app.get("/api/getsp/:id", (req, res) => {
    const product = store.data.products.find((item) => item.id === req.params.id || item.id.endsWith(String(req.params.id)));
    res.json(product ? [product] : []);
  });
  app.get("/api/getalldm", (_req, res) => res.json(store.data.categories));
  app.get("/api/getalldonhang", requireAuth, allowRoles("admin", "staff"), (_req, res) => res.json(store.data.orders));
  app.get("/api/getallnv", requireAuth, allowRoles("admin", "staff"), (_req, res) => res.json(store.data.employees));

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
