import {
  ORDER_STATUS_LABELS,
  allowed,
  asMoney,
  asPositiveInt,
  audit,
  createToken,
  currentUser,
  fail,
  hashPassword,
  json,
  nextId,
  normalizeText,
  publicProduct,
  readBody,
  sanitizeUser,
  saveState,
  verifyPassword,
} from "./core";
import type { Env, State, User } from "./types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+\s.-]{9,15}$/;

function normalizePaymentCode(value: unknown): string {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function safeTextEqual(actual: string, expected: string): boolean {
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

function couponResult(state: State, codeValue: unknown, subtotalValue: unknown) {
  const code = String(codeValue || "").trim().toUpperCase();
  const subtotal = asMoney(subtotalValue);
  const coupon = state.coupons.find((item: any) => item.code === code && item.active);
  if (!coupon || new Date(coupon.expiresAt) < new Date()) {
    return { error: fail(404, "Mã ưu đãi không tồn tại hoặc đã hết hạn.") };
  }
  if (subtotal < coupon.minOrder) {
    return { error: fail(400, `Đơn hàng cần tối thiểu ${coupon.minOrder.toLocaleString("vi-VN")}đ để dùng mã này.`) };
  }
  let discount = 0;
  if (coupon.type === "percent") {
    discount = Math.min(Math.round((subtotal * coupon.value) / 100), coupon.maxDiscount);
  }
  if (coupon.type === "fixed") {
    discount = Math.min(coupon.value, coupon.maxDiscount || coupon.value);
  }
  return {
    data: {
      code: coupon.code,
      type: coupon.type,
      discount,
      shippingDiscount: coupon.type === "shipping" ? coupon.value : 0,
    },
  };
}

function orderOwner(user: User, order: Record<string, any>): boolean {
  return ["admin", "staff"].includes(user.role) || order.userId === user.id;
}

export async function handlePublicApi(
  request: Request,
  url: URL,
  state: State,
  user: User | null,
  env: Env,
): Promise<Response | null> {
  const method = request.method;
  const pathname = url.pathname;

  if (method === "GET" && pathname === "/api/health") {
    return json({
      status: "ok",
      service: "NOVAWEAR API",
      storage: "D1",
      timestamp: new Date().toISOString(),
    });
  }

  if (method === "GET" && pathname === "/api/config") {
    return json({
      data: {
        brand: "NOVAWEAR",
        currency: "VND",
        freeShippingThreshold: 699000,
        supportEmail: "hello@novawear.vn",
      },
    });
  }

  if (method === "POST" && ["/api/auth/register", "/api/createaccount"].includes(pathname)) {
    const body = await readBody(request);
    const name = String(body.name || body.ten_nguoi_dung || "").trim();
    const email = normalizeText(body.email);
    const phone = String(body.phone || body.sdt || "").trim();
    const password = String(body.password || body.mat_khau || "");
    if (name.length < 2 || !emailPattern.test(email) || !phonePattern.test(phone) || password.length < 8) {
      return fail(400, "Vui lòng nhập đúng họ tên, email, số điện thoại và mật khẩu từ 8 ký tự.");
    }
    if (state.users.some((item: User) => normalizeText(item.email) === email)) {
      return fail(409, "Email này đã được sử dụng.");
    }
    const customer = {
      id: nextId("cus-"),
      name,
      email,
      phone,
      address: String(body.address || ""),
      tier: "Member",
      totalSpent: 0,
      orderCount: 0,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    const newUser = {
      id: nextId("usr-"),
      name,
      email,
      phone,
      role: "customer",
      employeeId: null,
      customerId: customer.id,
      status: "active",
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    state.customers.push(customer);
    state.users.push(newUser);
    audit(state, "create", "user", newUser.id, newUser);
    await saveState(env, state);
    return json({
      message: "Tạo tài khoản thành công.",
      token: await createToken(newUser, state.meta.jwtSecret),
      user: sanitizeUser(newUser),
    }, 201);
  }

  if (method === "POST" && ["/api/auth/login", "/api/login"].includes(pathname)) {
    const body = await readBody(request);
    const email = normalizeText(body.email);
    const password = String(body.password || body.mat_khau || "");
    const found = state.users.find((item: User) => normalizeText(item.email) === email);
    if (!found || found.status !== "active" || !(await verifyPassword(password, found.passwordHash))) {
      return fail(401, "Email hoặc mật khẩu chưa đúng.");
    }
    if (body.portal === "admin" && !["admin", "staff"].includes(found.role)) {
      return fail(403, "Tài khoản này không có quyền truy cập cổng vận hành.");
    }
    return json({
      message: "Đăng nhập thành công.",
      token: await createToken(found, state.meta.jwtSecret),
      user: sanitizeUser(found),
    });
  }

  if (pathname === "/api/auth/me" && method === "GET") {
    if (!user) return fail(401, "Vui lòng đăng nhập.");
    return json({ user: sanitizeUser(user) });
  }

  if (pathname === "/api/auth/me" && method === "PUT") {
    if (!user) return fail(401, "Vui lòng đăng nhập.");
    const body = await readBody(request);
    const name = body.name !== undefined ? String(body.name).trim() : user.name;
    const phone = body.phone !== undefined ? String(body.phone).trim() : user.phone;
    if (name.length < 2 || !phonePattern.test(phone)) {
      return fail(400, "Họ tên hoặc số điện thoại chưa hợp lệ.");
    }
    user.name = name;
    user.phone = phone;
    const customer = state.customers.find((item: any) => item.id === user.customerId);
    if (customer) {
      customer.name = name;
      customer.phone = phone;
      if (body.address !== undefined) customer.address = String(body.address).trim();
    }
    const employee = state.employees.find((item: any) => item.id === user.employeeId);
    if (employee) {
      employee.name = name;
      employee.phone = phone;
    }
    audit(state, "update", "user", user.id, user);
    await saveState(env, state);
    return json({ message: "Đã cập nhật hồ sơ.", user: sanitizeUser(user) });
  }

  if (pathname === "/api/auth/password" && method === "PUT") {
    if (!user) return fail(401, "Vui lòng đăng nhập.");
    const body = await readBody(request);
    if (!(await verifyPassword(String(body.currentPassword || ""), user.passwordHash))) {
      return fail(400, "Mật khẩu hiện tại chưa đúng.");
    }
    if (String(body.newPassword || "").length < 8) {
      return fail(400, "Mật khẩu mới cần ít nhất 8 ký tự.");
    }
    user.passwordHash = await hashPassword(String(body.newPassword));
    audit(state, "change_password", "user", user.id, user);
    await saveState(env, state);
    return json({ message: "Đã đổi mật khẩu." });
  }

  if (method === "GET" && pathname === "/api/categories") {
    return json({
      data: state.categories
        .filter((item: any) => item.status !== "archived")
        .map((item: any) => ({
          ...item,
          productCount: state.products.filter((product: any) => product.categoryId === item.id && product.status === "active").length,
        })),
    });
  }

  if (method === "GET" && pathname === "/api/products") {
    const search = normalizeText(url.searchParams.get("search") || url.searchParams.get("keyword"));
    const category = normalizeText(url.searchParams.get("category"));
    const status = url.searchParams.get("status") || "active";
    const featured = url.searchParams.get("featured");
    const sort = url.searchParams.get("sort") || "featured";
    const page = asPositiveInt(url.searchParams.get("page"), 1);
    const limit = Math.min(asPositiveInt(url.searchParams.get("limit") || url.searchParams.get("pageSize"), 12), 100);
    let products = [...state.products];

    if (status !== "all") products = products.filter((item: any) => item.status === status);
    if (featured === "true") products = products.filter((item: any) => item.featured);
    if (search) {
      products = products.filter((item: any) => normalizeText(`${item.name} ${item.sku} ${item.description}`).includes(search));
    }
    if (category) {
      const categoryItem = state.categories.find((item: any) => normalizeText(item.id) === category || normalizeText(item.slug) === category);
      products = categoryItem ? products.filter((item: any) => item.categoryId === categoryItem.id) : [];
    }
    if (url.searchParams.has("minPrice")) {
      const minPrice = asMoney(url.searchParams.get("minPrice"));
      products = products.filter((item: any) => item.price >= minPrice);
    }
    if (url.searchParams.has("maxPrice")) {
      const maxPrice = asMoney(url.searchParams.get("maxPrice"));
      products = products.filter((item: any) => item.price <= maxPrice);
    }
    const sorters: Record<string, (a: any, b: any) => number> = {
      newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      popular: (a, b) => b.sold - a.sold,
      rating: (a, b) => b.rating - a.rating,
      featured: (a, b) => Number(b.featured) - Number(a.featured) || b.sold - a.sold,
    };
    products.sort(sorters[sort] || sorters.featured);

    const total = products.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    return json({
      data: products.slice(start, start + limit).map((item: any) => publicProduct(item, state.categories)),
      pagination: { page: safePage, limit, total, totalPages },
    });
  }

  const productMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
  if (method === "GET" && productMatch) {
    const identifier = decodeURIComponent(productMatch[1]);
    const product = state.products.find((item: any) => item.id === identifier || item.slug === identifier);
    if (!product || product.status === "archived") return fail(404, "Sản phẩm không tồn tại.");
    const related = state.products
      .filter((item: any) => item.id !== product.id && item.categoryId === product.categoryId && item.status === "active")
      .slice(0, 4)
      .map((item: any) => publicProduct(item, state.categories));
    const reviews = state.reviews
      .filter((item: any) => item.productId === product.id && item.status === "published")
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return json({ data: publicProduct(product, state.categories), related, reviews });
  }

  const reviewMatch = pathname.match(/^\/api\/products\/([^/]+)\/reviews$/);
  if (method === "POST" && reviewMatch) {
    if (!user) return fail(401, "Vui lòng đăng nhập.");
    const product = state.products.find((item: any) => item.id === decodeURIComponent(reviewMatch[1]));
    if (!product) return fail(404, "Sản phẩm không tồn tại.");
    const body = await readBody(request);
    const rating = Number(body.rating);
    const content = String(body.content || "").trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail(400, "Điểm đánh giá phải từ 1 đến 5.");
    if (content.length < 10 || content.length > 500) return fail(400, "Nội dung đánh giá cần từ 10 đến 500 ký tự.");
    if (state.reviews.some((item: any) => item.productId === product.id && item.userId === user.id)) {
      return fail(409, "Bạn đã đánh giá sản phẩm này.");
    }
    const review = {
      id: nextId("rev-"),
      productId: product.id,
      userId: user.id,
      name: user.name,
      rating,
      content,
      status: "published",
      createdAt: new Date().toISOString(),
    };
    state.reviews.push(review);
    const published = state.reviews.filter((item: any) => item.productId === product.id && item.status === "published");
    product.rating = Math.round((published.reduce((sum: number, item: any) => sum + item.rating, 0) / published.length) * 10) / 10;
    product.reviewCount = published.length;
    audit(state, "create", "review", review.id, user);
    await saveState(env, state);
    return json({ message: "Cảm ơn bạn đã đánh giá.", data: review }, 201);
  }

  if (method === "POST" && pathname === "/api/coupons/validate") {
    const body = await readBody(request);
    const result = couponResult(state, body.code, body.subtotal);
    return result.error || json({ data: result.data });
  }

  if (method === "POST" && pathname === "/api/payments/sepay/webhook") {
    const webhookApiKey = String(env.SEPAY_WEBHOOK_API_KEY || "").trim();
    if (!webhookApiKey) return fail(503, "SePay webhook is not configured.");
    const authorization = String(request.headers.get("authorization") || "").trim();
    if (!safeTextEqual(authorization, `Apikey ${webhookApiKey}`)) {
      return fail(401, "Webhook authentication failed.");
    }

    const body = await readBody(request);
    const transactionId = String(body.id || "").trim();
    const transferAmount = asMoney(body.transferAmount);
    const transferType = String(body.transferType || "").toLowerCase();
    if (!transactionId || transferType !== "in" || transferAmount <= 0) {
      return fail(400, "Invalid SePay transaction payload.");
    }

    state.paymentTransactions = state.paymentTransactions || [];
    const duplicate = state.paymentTransactions.find((item: any) => String(item.id) === transactionId);
    if (duplicate) return json({ success: true, duplicate: true, orderId: duplicate.orderId || null });

    const searchableCode = normalizePaymentCode(`${body.code || ""} ${body.content || ""} ${body.description || ""}`);
    const order = state.orders.find((item: any) => {
      if (item.paymentProvider !== "sepay" || item.paymentStatus === "paid") return false;
      if (asMoney(item.total) !== transferAmount) return false;
      return [item.paymentCode, item.trackingCode, item.id]
        .map(normalizePaymentCode)
        .filter(Boolean)
        .some((candidate: string) => searchableCode.includes(candidate));
    });

    const receivedAt = new Date().toISOString();
    const transaction = {
      id: transactionId,
      orderId: order?.id || null,
      gateway: String(body.gateway || ""),
      accountNumber: String(body.accountNumber || ""),
      referenceCode: String(body.referenceCode || ""),
      transferAmount,
      code: String(body.code || ""),
      content: String(body.content || "").slice(0, 500),
      receivedAt,
    };
    state.paymentTransactions.unshift(transaction);
    state.paymentTransactions = state.paymentTransactions.slice(0, 1000);

    if (order) {
      order.paymentStatus = "paid";
      order.paidAt = receivedAt;
      order.updatedAt = receivedAt;
      order.paymentTransaction = transaction;
      if (order.status === "pending") {
        order.status = "confirmed";
        order.timeline.push({ status: "confirmed", label: ORDER_STATUS_LABELS.confirmed, at: receivedAt });
      }
      audit(state, "payment_confirmed", "order", order.id, { name: "SePay" });
    } else {
      audit(state, "payment_unmatched", "payment", transactionId, { name: "SePay" });
    }
    await saveState(env, state);
    return json({ success: true, matched: Boolean(order), orderId: order?.id || null });
  }

  const sepayStatusMatch = pathname.match(/^\/api\/payments\/sepay\/orders\/([^/]+)\/status$/);
  if (method === "GET" && sepayStatusMatch) {
    const order = state.orders.find((item: any) => item.id === decodeURIComponent(sepayStatusMatch[1]));
    const trackingCode = normalizePaymentCode(url.searchParams.get("trackingCode"));
    if (!order || !trackingCode || trackingCode !== normalizePaymentCode(order.trackingCode)) {
      return fail(404, "Payment not found.");
    }
    return json({
      data: {
        orderId: order.id,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        paidAt: order.paidAt || null,
      },
    });
  }

  if (method === "POST" && pathname === "/api/orders") {
    const body = await readBody(request);
    const customerInput = body.customer || {};
    const customer = {
      name: String(customerInput.name || "").trim(),
      email: normalizeText(customerInput.email),
      phone: String(customerInput.phone || "").trim(),
      address: String(customerInput.address || "").trim(),
    };
    if (customer.name.length < 2 || !phonePattern.test(customer.phone) || customer.address.length < 5) {
      return fail(400, "Thông tin người nhận chưa đầy đủ.");
    }
    if (!Array.isArray(body.items) || !body.items.length) return fail(400, "Giỏ hàng đang trống.");

    const lines: Record<string, any>[] = [];
    let subtotal = 0;
    for (const input of body.items) {
      const product = state.products.find((item: any) => item.id === input.productId && item.status === "active");
      const quantity = asPositiveInt(input.quantity, 1);
      if (!product) return fail(400, "Một sản phẩm trong giỏ không còn được bán.");
      if (product.stock < quantity) return fail(409, `${product.name} chỉ còn ${product.stock} sản phẩm.`);
      if (product.sizes?.length && !product.sizes.includes(input.size)) return fail(400, `Size của ${product.name} chưa hợp lệ.`);
      if (product.colors?.length && !product.colors.includes(input.color)) return fail(400, `Màu của ${product.name} chưa hợp lệ.`);
      lines.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        image: product.image,
        size: String(input.size || ""),
        color: String(input.color || ""),
        quantity,
        price: product.price,
      });
      subtotal += product.price * quantity;
    }

    let coupon = null;
    let discount = 0;
    let shippingDiscount = 0;
    if (body.couponCode) {
      const validation = couponResult(state, body.couponCode, subtotal);
      if (validation.error) return validation.error;
      coupon = validation.data;
      discount = coupon?.discount || 0;
      shippingDiscount = coupon?.shippingDiscount || 0;
    }
    const shippingMethod = body.shippingMethod === "express" ? "express" : "standard";
    const shippingFee = shippingMethod === "express" ? 60000 : (subtotal >= 699000 ? 0 : 30000);
    const paymentMethod = ["cod", "bank", "wallet"].includes(body.paymentMethod) ? body.paymentMethod : "cod";
    const createdAt = new Date().toISOString();
    const trackingCode = `NVA${String(Date.now()).slice(-8)}`;
    const order = {
      id: `ORD-${new Date().getFullYear()}-${String(state.orders.length + 1).padStart(4, "0")}`,
      trackingCode,
      userId: user?.id || null,
      customerId: user?.customerId || null,
      customer,
      items: lines,
      subtotal,
      shippingFee,
      discount,
      total: Math.max(0, subtotal + shippingFee - discount - shippingDiscount),
      couponCode: coupon?.code || "",
      shippingMethod,
      paymentMethod,
      paymentProvider: paymentMethod === "bank" ? "sepay" : null,
      paymentCode: paymentMethod === "bank" ? trackingCode : null,
      paymentStatus: paymentMethod === "cod" ? "pending" : "awaiting",
      status: "pending",
      note: String(body.note || "").slice(0, 500),
      internalNote: "",
      assigneeId: null,
      timeline: [{ status: "pending", label: ORDER_STATUS_LABELS.pending, at: createdAt }],
      createdAt,
      updatedAt: createdAt,
    };
    for (const line of lines) {
      const product = state.products.find((item: any) => item.id === line.productId);
      product.stock -= line.quantity;
      product.sold += line.quantity;
    }
    let customerRecord = user?.customerId
      ? state.customers.find((item: any) => item.id === user.customerId)
      : state.customers.find((item: any) => item.phone === customer.phone);
    if (!customerRecord) {
      customerRecord = {
        id: nextId("cus-"),
        ...customer,
        tier: "Member",
        totalSpent: 0,
        orderCount: 0,
        status: "active",
        createdAt,
      };
      state.customers.push(customerRecord);
    }
    order.customerId = customerRecord.id;
    customerRecord.name = customer.name;
    customerRecord.email = customer.email;
    customerRecord.address = customer.address;
    customerRecord.orderCount += 1;
    customerRecord.totalSpent += order.total;
    state.orders.unshift(order);
    audit(state, "create", "order", order.id, user);
    await saveState(env, state);
    return json({ message: "Đặt hàng thành công.", data: order }, 201);
  }

  if (method === "GET" && pathname === "/api/orders/my") {
    if (!user) return fail(401, "Vui lòng đăng nhập.");
    const orders = state.orders
      .filter((item: any) => item.userId === user.id || (user.customerId && item.customerId === user.customerId))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return json({ data: orders });
  }

  const trackMatch = pathname.match(/^\/api\/orders\/track\/([^/]+)$/);
  if (method === "GET" && trackMatch) {
    const trackingCode = decodeURIComponent(trackMatch[1]).toUpperCase();
    const phone = String(url.searchParams.get("phone") || "").replace(/\s/g, "");
    const order = state.orders.find((item: any) => (
      String(item.trackingCode).toUpperCase() === trackingCode
      && String(item.customer.phone).replace(/\s/g, "") === phone
    ));
    if (!order) return fail(404, "Không tìm thấy đơn hàng với thông tin đã nhập.");
    const { internalNote: _internalNote, ...safeOrder } = order;
    return json({ data: safeOrder });
  }

  const orderCancelMatch = pathname.match(/^\/api\/orders\/([^/]+)\/cancel$/);
  if (method === "PATCH" && orderCancelMatch) {
    if (!user) return fail(401, "Vui lòng đăng nhập.");
    const order = state.orders.find((item: any) => item.id === decodeURIComponent(orderCancelMatch[1]));
    if (!order) return fail(404, "Đơn hàng không tồn tại.");
    if (!orderOwner(user, order)) return fail(403, "Bạn không thể hủy đơn hàng này.");
    if (!["pending", "confirmed"].includes(order.status)) return fail(409, "Đơn hàng đã vào giai đoạn xử lý và không thể hủy trực tuyến.");
    for (const line of order.items) {
      const product = state.products.find((item: any) => item.id === line.productId);
      if (product) {
        product.stock += line.quantity;
        product.sold = Math.max(0, product.sold - line.quantity);
      }
    }
    order.status = "cancelled";
    order.updatedAt = new Date().toISOString();
    order.timeline.push({ status: "cancelled", label: ORDER_STATUS_LABELS.cancelled, at: order.updatedAt });
    audit(state, "cancel", "order", order.id, user);
    await saveState(env, state);
    return json({ message: "Đã hủy đơn hàng.", data: order });
  }

  const orderMatch = pathname.match(/^\/api\/orders\/([^/]+)$/);
  if (method === "GET" && orderMatch) {
    if (!user) return fail(401, "Vui lòng đăng nhập.");
    const order = state.orders.find((item: any) => item.id === decodeURIComponent(orderMatch[1]));
    if (!order) return fail(404, "Đơn hàng không tồn tại.");
    if (!orderOwner(user, order)) return fail(403, "Bạn không thể xem đơn hàng này.");
    return json({ data: order });
  }

  if (method === "POST" && pathname === "/api/contact") {
    const body = await readBody(request);
    const contact = {
      id: nextId("msg-"),
      name: String(body.name || "").trim(),
      email: normalizeText(body.email),
      phone: String(body.phone || "").trim(),
      subject: String(body.subject || "").trim(),
      message: String(body.message || "").trim(),
      status: "new",
      assigneeId: null,
      createdAt: new Date().toISOString(),
    };
    if (contact.name.length < 2 || !emailPattern.test(contact.email) || contact.subject.length < 3 || contact.message.length < 10) {
      return fail(400, "Vui lòng điền đầy đủ thông tin liên hệ.");
    }
    state.contacts.unshift(contact);
    await saveState(env, state);
    return json({ message: "NOVAWEAR đã nhận được lời nhắn của bạn." }, 201);
  }

  if (method === "POST" && pathname === "/api/newsletter") {
    const body = await readBody(request);
    const email = normalizeText(body.email);
    if (!emailPattern.test(email)) return fail(400, "Email chưa đúng định dạng.");
    if (!state.subscribers.some((item: any) => item.email === email)) {
      state.subscribers.push({ id: nextId("sub-"), email, createdAt: new Date().toISOString() });
      await saveState(env, state);
    }
    return json({ message: "Đăng ký nhận tin thành công." });
  }

  return null;
}
