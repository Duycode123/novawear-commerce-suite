const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createApp } = require("../app");

let server;
let baseUrl;
let tempDir;
const sentEmails = [];

test.before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "novawear-api-"));
  const app = createApp({
    dataFile: path.join(tempDir, "store.json"),
    sepayWebhookApiKey: "test-sepay-key",
    sepayQr: {
      bankCode: "MBBank",
      accountNumber: "0000000000",
      accountName: "NOVAWEAR TEST",
      template: "compact",
    },
    oauthService: {
      publicConfig: () => ({ google: true, facebook: false }),
      isConfigured: (provider) => provider === "google",
      createVerifier: () => "test-verifier",
      createChallenge: () => "test-challenge",
      authorizationUrl: (_provider, state) => `https://accounts.example/authorize?state=${encodeURIComponent(state)}`,
      exchange: async () => ({
        providerId: "google-customer-001",
        email: "oauth.customer@example.com",
        name: "OAuth Customer",
        avatar: "https://images.example/avatar.jpg",
      }),
    },
    cloudinaryService: {
      configured: true,
      async uploadImage(_buffer, folder) {
        return {
          url: `https://res.cloudinary.example/${folder}/test-image.webp`,
          publicId: `${folder}/test-image`,
          width: 800,
          height: 1000,
          bytes: 1024,
          format: "webp",
        };
      },
    },
    exposeVerificationCode: true,
    mailer: {
      configured: true,
      async sendVerification(payload) {
        sentEmails.push({ type: "verification", ...payload });
      },
      async sendOrderConfirmation(payload) {
        sentEmails.push({ type: "order", ...payload });
      },
    },
  });
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tempDir, { recursive: true, force: true });
});

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json();
  return { response, body };
}

async function loginAs(email, password, portal) {
  const result = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, ...(portal ? { portal } : {}) }),
  });
  assert.equal(result.response.status, 200);
  if (result.body.token) return result.body.token;
  assert.ok(result.body.operationsHandoffCode);
  const exchanged = await request("/auth/operations-exchange", {
    method: "POST",
    body: JSON.stringify({ code: result.body.operationsHandoffCode }),
  });
  assert.equal(exchanged.response.status, 200);
  assert.ok(exchanged.body.token);
  return exchanged.body.token;
}

test("health check and catalog are available", async () => {
  const health = await request("/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.body.status, "ok");

  const products = await request("/products?featured=true&limit=4");
  assert.equal(products.response.status, 200);
  assert.equal(products.body.data.length, 4);
  assert.ok(products.body.data.every((item) => item.featured));
});

test("guest checkout requires a verified email and sends an order confirmation", async () => {
  const customer = {
    name: "Guest Verified",
    email: "verified.guest@example.com",
    phone: "0987654321",
    address: "01 Le Loi, District 1, Ho Chi Minh City",
  };
  const blocked = await request("/orders", {
    method: "POST",
    body: JSON.stringify({
      customer,
      items: [{ productId: "prd-003", quantity: 1, size: "M", color: "Trắng kem" }],
      paymentMethod: "cod",
    }),
  });
  assert.equal(blocked.response.status, 403);
  assert.equal(blocked.body.code, "GUEST_EMAIL_VERIFICATION_REQUIRED");

  const requested = await request("/checkout/verification/request", {
    method: "POST",
    body: JSON.stringify({ email: customer.email, name: customer.name }),
  });
  assert.equal(requested.response.status, 200);
  assert.match(requested.body.verificationCode, /^\d{6}$/);

  const verified = await request("/checkout/verification/verify", {
    method: "POST",
    body: JSON.stringify({
      email: customer.email,
      code: requested.body.verificationCode,
    }),
  });
  assert.equal(verified.response.status, 200);
  assert.ok(verified.body.checkoutToken);

  const created = await request("/orders", {
    method: "POST",
    body: JSON.stringify({
      customer,
      checkoutToken: verified.body.checkoutToken,
      items: [{ productId: "prd-003", quantity: 1, size: "M", color: "Trắng kem" }],
      paymentMethod: "cod",
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.emailNotification.status, "sent");
  assert.ok(sentEmails.some((item) => (
    item.type === "order" && item.to === customer.email && item.order.id === created.body.data.id
  )));

  const replayed = await request("/orders", {
    method: "POST",
    body: JSON.stringify({
      customer,
      checkoutToken: verified.body.checkoutToken,
      items: [{ productId: "prd-003", quantity: 1, size: "M", color: "Trắng kem" }],
      paymentMethod: "cod",
    }),
  });
  assert.equal(replayed.response.status, 403);
});

test("operations handoff is short lived and can only be exchanged once", async () => {
  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "admin@novawear.vn",
      password: "Admin@123",
    }),
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.body.token, undefined);
  assert.ok(login.body.operationsHandoffCode);

  const first = await request("/auth/operations-exchange", {
    method: "POST",
    body: JSON.stringify({ code: login.body.operationsHandoffCode }),
  });
  assert.equal(first.response.status, 200);
  assert.ok(first.body.token);

  const replay = await request("/auth/operations-exchange", {
    method: "POST",
    body: JSON.stringify({ code: login.body.operationsHandoffCode }),
  });
  assert.equal(replay.response.status, 401);
});

test("OAuth uses state validation and a one-time exchange code", async () => {
  const started = await fetch(`${baseUrl}/auth/oauth/google/start`, { redirect: "manual" });
  assert.equal(started.status, 302);
  const authorizationUrl = new URL(started.headers.get("location"));
  const state = authorizationUrl.searchParams.get("state");
  assert.ok(state);

  const callback = await fetch(
    `${baseUrl}/auth/google/callback?state=${encodeURIComponent(state)}&code=provider-code`,
    { redirect: "manual" },
  );
  assert.equal(callback.status, 302);
  const callbackUrl = new URL(callback.headers.get("location"));
  const exchangeCode = callbackUrl.searchParams.get("code");
  assert.ok(exchangeCode);

  const exchanged = await request("/auth/oauth/exchange", {
    method: "POST",
    body: JSON.stringify({ code: exchangeCode }),
  });
  assert.equal(exchanged.response.status, 200);
  assert.equal(exchanged.body.user.email, "oauth.customer@example.com");
  assert.ok(exchanged.body.token);

  const replay = await request("/auth/oauth/exchange", {
    method: "POST",
    body: JSON.stringify({ code: exchangeCode }),
  });
  assert.equal(replay.response.status, 401);
});

test("authenticated image uploads enforce roles and persist avatars", async () => {
  const customerToken = await loginAs("demo@novawear.vn", "Demo@123");
  const deniedForm = new FormData();
  deniedForm.append("file", new Blob(["image"], { type: "image/png" }), "product.png");
  const denied = await fetch(`${baseUrl}/uploads/product`, {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: deniedForm,
  });
  assert.equal(denied.status, 403);

  const adminToken = await loginAs("admin@novawear.vn", "Admin@123", "admin");
  const productForm = new FormData();
  productForm.append("file", new Blob(["image"], { type: "image/png" }), "product.png");
  const uploadedProduct = await fetch(`${baseUrl}/uploads/product`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: productForm,
  });
  assert.equal(uploadedProduct.status, 201);

  const avatarForm = new FormData();
  avatarForm.append("file", new Blob(["image"], { type: "image/png" }), "avatar.png");
  const uploadedAvatar = await fetch(`${baseUrl}/uploads/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: avatarForm,
  });
  assert.equal(uploadedAvatar.status, 201);
  const profile = await request("/auth/me", {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.match(profile.body.user.avatar, /^https:\/\/res\.cloudinary\.example\//);
});

test("customer can sign in, place an order and read order history", async () => {
  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "demo@novawear.vn", password: "Demo@123" }),
  });
  assert.equal(login.response.status, 200);
  assert.ok(login.body.token);

  const order = await request("/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${login.body.token}` },
    body: JSON.stringify({
      customer: {
        name: "Nguyễn Minh Anh",
        email: "demo@novawear.vn",
        phone: "0901234567",
        address: "12 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh",
      },
      items: [{ productId: "prd-001", quantity: 1, size: "M", color: "Than chì" }],
      paymentMethod: "cod",
      couponCode: "",
    }),
  });
  assert.equal(order.response.status, 201);
  assert.equal(order.body.data.status, "pending");
  assert.equal(order.body.data.items[0].price, 289000);

  const unsafeTracking = await request(`/orders/track/${order.body.data.trackingCode}`);
  assert.equal(unsafeTracking.response.status, 400);

  const history = await request("/orders/my", {
    headers: { Authorization: `Bearer ${login.body.token}` },
  });
  assert.equal(history.response.status, 200);
  assert.ok(history.body.data.some((item) => item.id === order.body.data.id));
});

test("SePay webhook verifies, deduplicates and confirms a bank transfer", async () => {
  const token = await loginAs("demo@novawear.vn", "Demo@123");
  const created = await request("/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      customer: {
        name: "Payment Test",
        email: "payment.test@novawear.vn",
        phone: "0912345678",
        address: "28 Nguyen Van Trang, District 1, Ho Chi Minh City",
      },
      items: [{ productId: "prd-002", quantity: 1, size: "M", color: "Kem" }],
      paymentMethod: "bank",
      shippingMethod: "standard",
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.paymentProvider, "sepay");
  assert.equal(created.body.data.paymentStatus, "awaiting");
  assert.equal(created.body.data.paymentCode, created.body.data.trackingCode);

  const checkout = await request(
    `/payments/sepay/orders/${created.body.data.id}/checkout?trackingCode=${created.body.data.trackingCode}`,
  );
  assert.equal(checkout.response.status, 200);
  assert.equal(checkout.body.data.amount, created.body.data.total);
  assert.match(checkout.body.data.qrUrl, /^https:\/\/qr\.sepay\.vn\/img\?/);

  const before = await request(
    `/payments/sepay/orders/${created.body.data.id}/status?trackingCode=${created.body.data.trackingCode}`,
  );
  assert.equal(before.response.status, 200);
  assert.equal(before.body.data.paymentStatus, "awaiting");

  const payload = {
    id: 92704,
    gateway: "MBBank",
    transactionDate: "2026-07-29 10:00:00",
    accountNumber: "0000000000",
    code: created.body.data.paymentCode,
    content: `${created.body.data.paymentCode} thanh toan`,
    transferType: "in",
    transferAmount: created.body.data.total,
    referenceCode: "FT26000000001",
  };
  const denied = await request("/payments/sepay/webhook", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  assert.equal(denied.response.status, 401);

  const confirmed = await request("/payments/sepay/webhook", {
    method: "POST",
    headers: { Authorization: "Apikey test-sepay-key" },
    body: JSON.stringify(payload),
  });
  assert.equal(confirmed.response.status, 200);
  assert.equal(confirmed.body.success, true);
  assert.equal(confirmed.body.matched, true);
  assert.equal(confirmed.body.orderId, created.body.data.id);

  const after = await request(
    `/payments/sepay/orders/${created.body.data.id}/status?trackingCode=${created.body.data.trackingCode}`,
  );
  assert.equal(after.body.data.paymentStatus, "paid");
  assert.equal(after.body.data.orderStatus, "confirmed");

  const duplicate = await request("/payments/sepay/webhook", {
    method: "POST",
    headers: { Authorization: "Apikey test-sepay-key" },
    body: JSON.stringify(payload),
  });
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.body.duplicate, true);
});

test("staff portal is protected and supports order workflow", async () => {
  const denied = await request("/admin/overview");
  assert.equal(denied.response.status, 401);

  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "staff@novawear.vn", password: "Staff@123", portal: "admin" }),
  });
  assert.equal(login.response.status, 200);
  const exchange = await request("/auth/operations-exchange", {
    method: "POST",
    body: JSON.stringify({ code: login.body.operationsHandoffCode }),
  });
  assert.equal(exchange.response.status, 200);
  const staffToken = exchange.body.token;

  const overview = await request("/admin/overview", {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert.equal(overview.response.status, 200);
  assert.ok(overview.body.data.orderCount >= 4);

  const update = await request("/admin/orders/ORD-2026-004", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ status: "confirmed", assigneeId: "emp-002" }),
  });
  assert.equal(update.response.status, 200);
  assert.equal(update.body.data.status, "confirmed");

  const workspace = await request("/staff/workspace", {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert.equal(workspace.response.status, 200);
  assert.equal(workspace.body.data.employee.id, "emp-002");
});

test("customer self-service, coupon and support flows work end to end", async () => {
  const register = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Test Customer",
      email: "customer.test@novawear.vn",
      phone: "0909876543",
      password: "Customer@123",
    }),
  });
  assert.equal(register.response.status, 201);
  assert.equal(register.body.requiresVerification, true);
  assert.match(register.body.verificationCode, /^\d{6}$/);
  assert.ok(sentEmails.some((item) => (
    item.type === "verification" && item.to === "customer.test@novawear.vn"
  )));

  const blockedLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "customer.test@novawear.vn",
      password: "Customer@123",
    }),
  });
  assert.equal(blockedLogin.response.status, 403);
  assert.equal(blockedLogin.body.code, "ACCOUNT_NOT_VERIFIED");

  const invalidVerification = await request("/auth/verify", {
    method: "POST",
    body: JSON.stringify({
      email: "customer.test@novawear.vn",
      code: "000000",
    }),
  });
  assert.equal(invalidVerification.response.status, 400);

  const verified = await request("/auth/verify", {
    method: "POST",
    body: JSON.stringify({
      email: "customer.test@novawear.vn",
      code: register.body.verificationCode,
    }),
  });
  assert.equal(verified.response.status, 200);
  assert.ok(verified.body.token);
  assert.equal(verified.body.user.verified, true);

  const profile = await request("/auth/me", {
    method: "PUT",
    headers: { Authorization: `Bearer ${verified.body.token}` },
    body: JSON.stringify({ name: "Updated Customer", address: "District 1, Ho Chi Minh City" }),
  });
  assert.equal(profile.response.status, 200);
  assert.equal(profile.body.user.name, "Updated Customer");

  const coupon = await request("/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code: "NOVA10", subtotal: 800000 }),
  });
  assert.equal(coupon.response.status, 200);
  assert.equal(coupon.body.data.discount, 80000);

  const contact = await request("/contact", {
    method: "POST",
    body: JSON.stringify({
      name: "Updated Customer",
      email: "customer.test@novawear.vn",
      phone: "0909876543",
      subject: "Order support",
      message: "Please help me check the delivery window for my order.",
    }),
  });
  assert.equal(contact.response.status, 201);

  const newsletter = await request("/newsletter", {
    method: "POST",
    body: JSON.stringify({ email: "customer.test@novawear.vn" }),
  });
  assert.equal(newsletter.response.status, 200);
});

test("JWT protects private APIs and rotates after a password change", async () => {
  const register = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "JWT Test Customer",
      email: "jwt.test@novawear.vn",
      phone: "0909000001",
      password: "JwtTest@123",
    }),
  });
  assert.equal(register.response.status, 201);

  const verified = await request("/auth/verify", {
    method: "POST",
    body: JSON.stringify({
      email: "jwt.test@novawear.vn",
      code: register.body.verificationCode,
    }),
  });
  assert.equal(verified.response.status, 200);
  const firstToken = verified.body.token;

  const authorized = await request("/auth/me", {
    headers: { Authorization: `Bearer ${firstToken}` },
  });
  assert.equal(authorized.response.status, 200);
  assert.equal(authorized.body.user.email, "jwt.test@novawear.vn");

  const tampered = `${firstToken.slice(0, -1)}${firstToken.endsWith("a") ? "b" : "a"}`;
  const rejected = await request("/auth/me", {
    headers: { Authorization: `Bearer ${tampered}` },
  });
  assert.equal(rejected.response.status, 401);

  const changed = await request("/auth/password", {
    method: "PUT",
    headers: { Authorization: `Bearer ${firstToken}` },
    body: JSON.stringify({
      currentPassword: "JwtTest@123",
      newPassword: "JwtNext@456",
    }),
  });
  assert.equal(changed.response.status, 200);
  assert.ok(changed.body.token);

  const oldTokenRejected = await request("/auth/me", {
    headers: { Authorization: `Bearer ${firstToken}` },
  });
  assert.equal(oldTokenRejected.response.status, 401);

  const rotatedTokenAccepted = await request("/auth/me", {
    headers: { Authorization: `Bearer ${changed.body.token}` },
  });
  assert.equal(rotatedTokenAccepted.response.status, 200);
});

test("admin can manage catalog, inventory and purchase receiving", async () => {
  const token = await loginAs("admin@novawear.vn", "Admin@123", "admin");
  const auth = { Authorization: `Bearer ${token}` };

  const created = await request("/admin/products", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: "Integration Test Tee",
      sku: "NW-TEST-001",
      categoryId: "cat-tee",
      price: 299000,
      cost: 120000,
      stock: 10,
      status: "active",
      sizes: ["S", "M", "L"],
      colors: ["Navy"],
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.stock, 10);

  const adjusted = await request("/admin/inventory/adjust", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ productId: created.body.data.id, quantity: 5, reason: "test" }),
  });
  assert.equal(adjusted.response.status, 200);
  assert.equal(adjusted.body.data.stock, 15);

  const purchase = await request("/admin/purchase-orders", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      supplier: "Test Supplier",
      items: [{ productId: created.body.data.id, quantity: 4, unitCost: 115000 }],
    }),
  });
  assert.equal(purchase.response.status, 201);

  const received = await request(`/admin/purchase-orders/${purchase.body.data.id}/receive`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({}),
  });
  assert.equal(received.response.status, 200);

  const inventory = await request("/admin/inventory?search=NW-TEST-001", { headers: auth });
  assert.equal(inventory.response.status, 200);
  assert.equal(inventory.body.data[0].stock, 19);

  const removed = await request(`/admin/products/${created.body.data.id}`, {
    method: "DELETE",
    headers: auth,
  });
  assert.equal(removed.response.status, 200);
});

test("employee can close a shift and complete assigned work", async () => {
  const token = await loginAs("staff@novawear.vn", "Staff@123", "admin");
  const auth = { Authorization: `Bearer ${token}` };

  const attendance = await request("/staff/attendance", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ action: "check_out" }),
  });
  assert.equal(attendance.response.status, 200);
  assert.ok(attendance.body.data.checkOut);

  const task = await request("/staff/tasks/task-002", {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({ status: "done" }),
  });
  assert.equal(task.response.status, 200);
  assert.equal(task.body.data.status, "done");
});

test("admin can assign work and customer return is processed end to end", async () => {
  const adminToken = await loginAs("admin@novawear.vn", "Admin@123", "admin");
  const customerToken = await loginAs("demo@novawear.vn", "Demo@123");
  const adminAuth = { Authorization: `Bearer ${adminToken}` };
  const customerAuth = { Authorization: `Bearer ${customerToken}` };

  const task = await request("/admin/tasks", {
    method: "POST",
    headers: adminAuth,
    body: JSON.stringify({
      employeeId: "emp-002",
      title: "Kiểm tra yêu cầu đổi trả",
      description: "Đối chiếu sản phẩm và tình trạng hàng gửi về.",
      priority: "high",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    }),
  });
  assert.equal(task.response.status, 201);
  assert.equal(task.body.data.status, "todo");

  const delivered = await request("/admin/orders/ORD-2026-001", {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({ status: "delivered" }),
  });
  assert.equal(delivered.response.status, 200);
  assert.equal(delivered.body.data.paymentStatus, "paid");

  const created = await request("/returns", {
    method: "POST",
    headers: customerAuth,
    body: JSON.stringify({
      orderId: "ORD-2026-001",
      type: "return",
      reason: "Sản phẩm không còn phù hợp nhu cầu sử dụng.",
      items: [{
        productId: delivered.body.data.items[0].productId,
        size: delivered.body.data.items[0].size,
        color: delivered.body.data.items[0].color,
        quantity: 1,
      }],
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.status, "requested");

  for (const status of ["approved", "receiving", "completed"]) {
    const update = await request(`/admin/returns/${created.body.data.id}`, {
      method: "PATCH",
      headers: adminAuth,
      body: JSON.stringify({ status }),
    });
    assert.equal(update.response.status, 200);
    assert.equal(update.body.data.status, status);
  }

  const history = await request("/returns/my", { headers: customerAuth });
  assert.equal(history.response.status, 200);
  assert.equal(history.body.data[0].status, "completed");
});
