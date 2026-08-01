const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createApp } = require("../app");
const { JsonStore } = require("../lib/store");
const { enforceProductionIdentityPolicy } = require("../lib/production-identity");
const { verifyPassword } = require("../lib/security");

let server;
let application;
let baseUrl;
let tempDir;
const sentEmails = [];
const sepayPollingResults = new Map();

function confirmAddress(customer) {
  return { confirmed: true, address: customer.address };
}

test.before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "novawear-api-"));
  application = createApp({
    dataFile: path.join(tempDir, "store.json"),
    sepayWebhookApiKey: "test-sepay-key",
    sepayQr: {
      bankCode: "MBBank",
      accountNumber: "0000000000",
      accountName: "NOVAWEAR TEST",
      template: "compact",
    },
    sepayTransactionLookup: async ({ reference }) => sepayPollingResults.get(reference) || null,
    oauthService: {
      publicConfig: () => ({ google: true, facebook: true }),
      isConfigured: (provider) => ["google", "facebook"].includes(provider),
      createVerifier: () => "test-verifier",
      createChallenge: () => "test-challenge",
      authorizationUrl: (_provider, state) => `https://accounts.example/authorize?state=${encodeURIComponent(state)}`,
      exchange: async (provider, code) => provider === "facebook"
        ? {
          providerId: "facebook-customer-001",
          email: code === "existing-account-code"
            ? "demo@novawear.vn"
            : "facebook.oauth.customer@example.com",
          emailVerified: false,
          name: "Facebook OAuth Customer",
          avatar: "https://images.example/facebook-avatar.jpg",
        }
        : {
          providerId: "google-customer-001",
          email: "oauth.customer@example.com",
          emailVerified: true,
          name: "OAuth Customer",
          avatar: "https://images.example/avatar.jpg",
        },
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
      async sendOrderStatusUpdate(payload) {
        sentEmails.push({ type: "order-status", ...payload });
      },
      async sendReturnStatusUpdate(payload) {
        sentEmails.push({ type: "return-status", ...payload });
      },
    },
  });
  await new Promise((resolve) => {
    server = application.listen(0, "127.0.0.1", resolve);
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

  const saleProducts = await request("/products?sale=true&sort=discount-desc&limit=100");
  assert.equal(saleProducts.response.status, 200);
  assert.ok(saleProducts.body.data.length > 0);
  assert.ok(saleProducts.body.data.every((item) => (
    Number(item.comparePrice) > Number(item.price)
    && (!item.saleEndsAt || new Date(item.saleEndsAt) > new Date())
  )));
  const discountRates = saleProducts.body.data.map(
    (item) => (Number(item.comparePrice) - Number(item.price)) / Number(item.comparePrice),
  );
  assert.deepEqual(discountRates, [...discountRates].sort((left, right) => right - left));

  const promotions = await request("/promotions");
  assert.equal(promotions.response.status, 200);
  assert.ok(promotions.body.data.length > 0);
  assert.ok(promotions.body.data.every((item) => (
    item.code
    && new Date(item.startsAt || 0) <= new Date()
    && new Date(item.expiresAt) > new Date()
  )));

  const saleSummary = await request("/promotions/catalog-summary");
  assert.equal(saleSummary.response.status, 200);
  assert.equal(saleSummary.body.data.totalSaleProducts, saleProducts.body.pagination.total);
  assert.equal(saleSummary.body.data.categoryCount, saleSummary.body.data.categories.length);
  assert.deepEqual(saleSummary.body.data.featuredCategory, saleSummary.body.data.categories[0]);
  assert.ok(saleSummary.body.data.categories.every((item) => (
    item.productCount > 0
    && item.minDiscountPercent > 0
    && item.minDiscountPercent <= item.averageDiscountPercent
    && item.averageDiscountPercent <= item.maxDiscountPercent
    && item.images.length <= 2
  )));
  for (let index = 1; index < saleSummary.body.data.categories.length; index += 1) {
    const previous = saleSummary.body.data.categories[index - 1];
    const current = saleSummary.body.data.categories[index];
    assert.ok(
      previous.productCount > current.productCount
      || (
        previous.productCount === current.productCount
        && previous.averageDiscountPercent >= current.averageDiscountPercent
      ),
    );
  }

  const hiddenProduct = application.locals.store.data.products[0];
  const previousProductStatus = hiddenProduct.status;
  hiddenProduct.status = "draft";
  const hiddenCategory = application.locals.store.data.categories[0];
  const previousCategoryStatus = hiddenCategory.status;
  hiddenCategory.status = "draft";
  application.locals.store.save();

  const publicAllAttempt = await request(`/products?status=all&search=${encodeURIComponent(hiddenProduct.sku)}`);
  assert.equal(publicAllAttempt.response.status, 200);
  assert.equal(publicAllAttempt.body.data.length, 0);
  const publicDetailAttempt = await request(`/products/${hiddenProduct.id}`);
  assert.equal(publicDetailAttempt.response.status, 404);
  const legacyDetailAttempt = await request(`/getsp/${hiddenProduct.id}`);
  assert.equal(legacyDetailAttempt.response.status, 200);
  assert.equal(legacyDetailAttempt.body.length, 0);
  const publicCategories = await request("/categories");
  assert.equal(publicCategories.body.data.some((item) => item.id === hiddenCategory.id), false);
  const legacyCategories = await request("/getalldm");
  assert.equal(legacyCategories.body.some((item) => item.id === hiddenCategory.id), false);

  hiddenProduct.status = previousProductStatus;
  hiddenCategory.status = previousCategoryStatus;
  application.locals.store.save();
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
      addressConfirmation: confirmAddress(customer),
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
      addressConfirmation: confirmAddress(customer),
      checkoutToken: verified.body.checkoutToken,
      items: [{ productId: "prd-003", quantity: 1, size: "M", color: "Trắng kem" }],
      paymentMethod: "cod",
    }),
  });
  assert.equal(created.response.status, 201);
  assert.match(created.body.data.trackingCode, /^NVA\d{2}[A-F0-9]{12}$/);
  const storedGuestOrder = application.locals.store.data.orders.find((item) => item.id === created.body.data.id);
  assert.equal(storedGuestOrder.emailNotification.status, "sent");
  assert.equal(Object.hasOwn(created.body.data, "emailNotification"), false);
  assert.ok(sentEmails.some((item) => (
    item.type === "order" && item.to === customer.email && item.order.id === created.body.data.id
  )));

  const replayed = await request("/orders", {
    method: "POST",
    body: JSON.stringify({
      customer,
      addressConfirmation: confirmAddress(customer),
      checkoutToken: verified.body.checkoutToken,
      items: [{ productId: "prd-003", quantity: 1, size: "M", color: "Trắng kem" }],
      paymentMethod: "cod",
    }),
  });
  assert.equal(replayed.response.status, 200);
  assert.equal(replayed.body.idempotent, true);
  assert.equal(replayed.body.data.id, created.body.data.id);
  assert.equal(Object.hasOwn(replayed.body.data, "guestCheckoutJti"), false);
});

test("a guest checkout token cannot bypass a newly created account", async () => {
  const email = "guest.becomes.member@example.com";
  const requested = await request("/checkout/verification/request", {
    method: "POST",
    body: JSON.stringify({ email, name: "Guest Becomes Member" }),
  });
  const verified = await request("/checkout/verification/verify", {
    method: "POST",
    body: JSON.stringify({ email, code: requested.body.verificationCode }),
  });
  assert.equal(verified.response.status, 200);

  const registered = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Guest Becomes Member",
      email,
      phone: "0908887776",
      password: "Member@2026",
    }),
  });
  assert.equal(registered.response.status, 201);

  const blocked = await request("/orders", {
    method: "POST",
    body: JSON.stringify({
      customer: {
        name: "Guest Becomes Member",
        email,
        phone: "0908887776",
        address: "15 Nguyen Hue, District 1, Ho Chi Minh City",
      },
      addressConfirmation: { confirmed: true, address: "15 Nguyen Hue, District 1, Ho Chi Minh City" },
      checkoutToken: verified.body.checkoutToken,
      items: [{ productId: "prd-003", quantity: 1, size: "M", color: "Trắng kem" }],
      paymentMethod: "cod",
    }),
  });
  assert.equal(blocked.response.status, 409);
  assert.equal(blocked.body.code, "ACCOUNT_LOGIN_REQUIRED");
});

test("a verified registration adopts prior guest orders without duplicating the customer", async () => {
  const email = "verified.guest@example.com";
  const guestOrder = application.locals.store.data.orders
    .find((item) => item.customer.email === email);
  assert.ok(guestOrder);

  const registered = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Guest Becomes Customer",
      email,
      phone: "0987654321",
      password: "MemberGuest@2026",
    }),
  });
  assert.equal(registered.response.status, 201);

  const verified = await request("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ email, code: registered.body.verificationCode }),
  });
  assert.equal(verified.response.status, 200);
  const history = await request("/orders/my", {
    headers: { Authorization: `Bearer ${verified.body.token}` },
  });
  assert.equal(history.response.status, 200);
  assert.equal(history.body.data.some((item) => item.id === guestOrder.id), true);
  assert.equal(
    application.locals.store.data.customers
      .filter((item) => item.email === email).length,
    1,
  );
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

test("OAuth without a verified provider email requires email OTP and cannot take over an existing account", async () => {
  const started = await fetch(`${baseUrl}/auth/oauth/facebook/start`, { redirect: "manual" });
  assert.equal(started.status, 302);
  const authorizationUrl = new URL(started.headers.get("location"));
  const state = authorizationUrl.searchParams.get("state");
  assert.ok(state);

  const callback = await fetch(
    `${baseUrl}/auth/facebook/callback?state=${encodeURIComponent(state)}&code=provider-code`,
    { redirect: "manual" },
  );
  assert.equal(callback.status, 302);
  const callbackUrl = new URL(callback.headers.get("location"));
  assert.equal(callbackUrl.searchParams.get("verifyEmail"), "facebook.oauth.customer@example.com");
  assert.equal(callbackUrl.searchParams.get("code"), null);

  const pendingUser = application.locals.store.data.users
    .find((item) => item.email === "facebook.oauth.customer@example.com");
  assert.equal(pendingUser.status, "pending");
  assert.equal(pendingUser.emailVerifiedAt, null);
  const verificationEmail = sentEmails.find((item) => (
    item.type === "verification"
      && item.to === "facebook.oauth.customer@example.com"
      && item.purpose === "account"
  ));
  assert.ok(verificationEmail);

  const verified = await request("/auth/verify", {
    method: "POST",
    body: JSON.stringify({
      email: pendingUser.email,
      code: verificationEmail.code,
    }),
  });
  assert.equal(verified.response.status, 200);
  assert.ok(verified.body.token);

  const takeoverStart = await fetch(`${baseUrl}/auth/oauth/facebook/start`, { redirect: "manual" });
  const takeoverState = new URL(takeoverStart.headers.get("location")).searchParams.get("state");
  const takeoverCallback = await fetch(
    `${baseUrl}/auth/facebook/callback?state=${encodeURIComponent(takeoverState)}&code=existing-account-code`,
    { redirect: "manual" },
  );
  assert.equal(takeoverCallback.status, 302);
  const takeoverUrl = new URL(takeoverCallback.headers.get("location"));
  assert.equal(takeoverUrl.searchParams.get("oauthError"), "provider_email_not_verified");
  const existingUser = application.locals.store.data.users.find((item) => item.email === "demo@novawear.vn");
  assert.equal(existingUser.facebookId, undefined);
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

  const checkoutRequestId = "customer-checkout-request-0001";
  const orderPayload = {
    customer: {
      name: "Nguyễn Minh Anh",
      email: "demo@novawear.vn",
      phone: "0901234567",
      address: "12 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh",
    },
    addressConfirmation: { confirmed: true, address: "12 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh" },
    items: [{ productId: "prd-001", quantity: 1, size: "M", color: "Than chì" }],
    paymentMethod: "cod",
    couponCode: "",
    requestId: checkoutRequestId,
  };
  const order = await request("/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${login.body.token}` },
    body: JSON.stringify(orderPayload),
  });
  assert.equal(order.response.status, 201);
  assert.equal(order.body.data.status, "confirmed");
  assert.equal(order.body.data.items[0].price, 289000);
  assert.equal(Object.hasOwn(order.body.data, "checkoutRequestId"), false);

  const replayedOrder = await request("/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${login.body.token}` },
    body: JSON.stringify(orderPayload),
  });
  assert.equal(replayedOrder.response.status, 200);
  assert.equal(replayedOrder.body.idempotent, true);
  assert.equal(replayedOrder.body.data.id, order.body.data.id);

  const unsafeTracking = await request(`/orders/track/${order.body.data.trackingCode}`);
  assert.equal(unsafeTracking.response.status, 400);

  const history = await request("/orders/my", {
    headers: { Authorization: `Bearer ${login.body.token}` },
  });
  assert.equal(history.response.status, 200);
  assert.ok(history.body.data.some((item) => item.id === order.body.data.id));
});

test("membership benefits are calculated and checkout requires the exact reviewed address", async () => {
  const tiers = await request("/membership/tiers");
  assert.equal(tiers.response.status, 200);
  assert.deepEqual(tiers.body.data.map((item) => item.key), ["Member", "Silver", "Gold"]);
  assert.equal(tiers.body.data.find((item) => item.key === "Silver").discountPercent, 2);
  assert.equal(tiers.body.data.find((item) => item.key === "Gold").freeShippingThreshold, 0);

  const token = await loginAs("demo@novawear.vn", "Demo@123");
  const profile = await request("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(profile.response.status, 200);
  assert.equal(profile.body.membership.tier, "Member");
  assert.equal(profile.body.membership.discountPercent, 0);
  assert.ok(Array.isArray(profile.body.membership.benefits));

  const blocked = await request("/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      customer: {
        name: "Nguyễn Minh Anh",
        email: "demo@novawear.vn",
        phone: "0901234567",
        address: "12 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh",
      },
      addressConfirmation: {
        confirmed: true,
        address: "Một địa chỉ khác chưa được xem trên bản đồ",
      },
      items: [{ productId: "prd-001", quantity: 1, size: "M", color: "Than chì" }],
      paymentMethod: "cod",
      requestId: "customer-checkout-address-review-0001",
    }),
  });
  assert.equal(blocked.response.status, 400);
  assert.equal(blocked.body.code, "ADDRESS_CONFIRMATION_REQUIRED");
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
      addressConfirmation: { confirmed: true, address: "28 Nguyen Van Trang, District 1, Ho Chi Minh City" },
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

test("SePay transaction polling confirms a bank transfer without changing another webhook", async () => {
  const token = await loginAs("demo@novawear.vn", "Demo@123");
  const created = await request("/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      customer: {
        name: "Polling Test",
        email: "polling.test@novawear.vn",
        phone: "0912345678",
        address: "28 Nguyen Van Trang, District 1, Ho Chi Minh City",
      },
      addressConfirmation: { confirmed: true, address: "28 Nguyen Van Trang, District 1, Ho Chi Minh City" },
      items: [{ productId: "prd-002", quantity: 1, size: "M", color: "Kem" }],
      paymentMethod: "bank",
      shippingMethod: "standard",
    }),
  });
  assert.equal(created.response.status, 201);

  sepayPollingResults.set(created.body.data.paymentCode, {
    id: "polling-transaction-001",
    gateway: "MBBank",
    accountNumber: "0000000000",
    referenceCode: "FT26000000002",
    transferAmount: created.body.data.total,
    code: created.body.data.paymentCode,
    content: `${created.body.data.paymentCode} thanh toan`,
    receivedAt: new Date().toISOString(),
  });

  const status = await request(
    `/payments/sepay/orders/${created.body.data.id}/status?trackingCode=${created.body.data.trackingCode}`,
  );
  assert.equal(status.response.status, 200);
  assert.equal(status.body.data.paymentStatus, "paid");
  assert.equal(status.body.data.orderStatus, "confirmed");
  sepayPollingResults.delete(created.body.data.paymentCode);
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
  const staffAuth = { Authorization: `Bearer ${staffToken}` };

  const overview = await request("/admin/overview", {
    headers: staffAuth,
  });
  assert.equal(overview.response.status, 403);

  const adminToken = await loginAs("admin@novawear.vn", "Admin@123", "admin");
  const protectedOrder = await request("/admin/orders/ORD-2026-002", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const assignedElsewhere = await request("/admin/orders/ORD-2026-002", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      status: "packing",
      assigneeId: "emp-001",
      expectedVersion: protectedOrder.body.data.version,
    }),
  });
  assert.equal(assignedElsewhere.response.status, 200);

  const scopedOrders = await request("/admin/orders", { headers: staffAuth });
  assert.equal(scopedOrders.response.status, 200);
  assert.equal(scopedOrders.body.data.some((item) => item.id === "ORD-2026-002"), false);
  assert.equal(scopedOrders.body.data.some((item) => item.id === "ORD-2026-004"), true);
  const scopedLegacyOrders = await request("/getalldonhang", { headers: staffAuth });
  assert.equal(scopedLegacyOrders.response.status, 200);
  assert.equal(scopedLegacyOrders.body.some((item) => item.id === "ORD-2026-002"), false);
  const deniedAssignedOrder = await request("/admin/orders/ORD-2026-002", { headers: staffAuth });
  assert.equal(deniedAssignedOrder.response.status, 403);
  const deniedAssignedMutation = await request("/admin/orders/ORD-2026-002", {
    method: "PATCH",
    headers: staffAuth,
    body: JSON.stringify({
      status: "ready_to_ship",
      expectedVersion: assignedElsewhere.body.data.version,
    }),
  });
  assert.equal(deniedAssignedMutation.response.status, 403);
  const scopedNotifications = await request("/notifications", { headers: staffAuth });
  assert.equal(scopedNotifications.response.status, 200);
  assert.equal(scopedNotifications.body.data.some((item) => item.orderId === "ORD-2026-002"), false);

  const deniedInventoryAdjustment = await request("/admin/inventory/adjust", {
    method: "POST",
    headers: staffAuth,
    body: JSON.stringify({ productId: "prd-001", quantity: 1, reason: "Không được phép" }),
  });
  assert.equal(deniedInventoryAdjustment.response.status, 403);
  const deniedPurchaseCreation = await request("/admin/purchase-orders", {
    method: "POST",
    headers: staffAuth,
    body: JSON.stringify({
      supplier: "Nhà cung cấp thử nghiệm",
      items: [{ productId: "prd-001", quantity: 1, unitCost: 100000 }],
    }),
  });
  assert.equal(deniedPurchaseCreation.response.status, 403);
  const deniedPurchaseReceiving = await request("/admin/purchase-orders/PO-2026-001/receive", {
    method: "PATCH",
    headers: staffAuth,
    body: JSON.stringify({}),
  });
  assert.equal(deniedPurchaseReceiving.response.status, 403);

  const deniedElevatedCustomer = await request("/admin/customers", {
    method: "POST",
    headers: staffAuth,
    body: JSON.stringify({
      name: "Khách kiểm thử phân quyền",
      email: "staff-tier-denied@novawear.vn",
      phone: "0911222333",
      tier: "Gold",
    }),
  });
  assert.equal(deniedElevatedCustomer.response.status, 400);

  const staffCreatedCustomer = await request("/admin/customers", {
    method: "POST",
    headers: staffAuth,
    body: JSON.stringify({
      name: "Khách do nhân viên tạo",
      email: "staff-created-customer@novawear.vn",
      phone: "0911222444",
      tier: "Member",
    }),
  });
  assert.equal(staffCreatedCustomer.response.status, 201);
  assert.equal(staffCreatedCustomer.body.data.tier, "Member");

  const deniedTierUpdate = await request(`/admin/customers/${staffCreatedCustomer.body.data.id}`, {
    method: "PUT",
    headers: staffAuth,
    body: JSON.stringify({ tier: "Silver" }),
  });
  assert.equal(deniedTierUpdate.response.status, 400);

  const invalidAdminTier = await request("/admin/customers", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: "Khách có hạng sai",
      email: "invalid-tier@novawear.vn",
      phone: "0911222555",
      tier: "Platinum",
    }),
  });
  assert.equal(invalidAdminTier.response.status, 400);

  const adminCreatedCustomer = await request("/admin/customers", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: "Khách do quản trị viên tạo",
      email: "admin-created-customer@novawear.vn",
      phone: "0911222666",
      tier: "Member",
    }),
  });
  assert.equal(adminCreatedCustomer.response.status, 201);
  assert.equal(adminCreatedCustomer.body.data.tier, "Member");

  const adminUpdatedTier = await request(`/admin/customers/${adminCreatedCustomer.body.data.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ tier: "Silver" }),
  });
  assert.equal(adminUpdatedTier.response.status, 400);

  const beforeUpdate = await request("/admin/orders/ORD-2026-004", {
    headers: staffAuth,
  });
  assert.equal(beforeUpdate.response.status, 200);

  const update = await request("/admin/orders/ORD-2026-004", {
    method: "PATCH",
    headers: staffAuth,
    body: JSON.stringify({
      status: "confirmed",
      assigneeId: "emp-002",
      expectedVersion: beforeUpdate.body.data.version,
    }),
  });
  assert.equal(update.response.status, 200);
  assert.equal(update.body.data.status, "confirmed");

  const workspace = await request("/staff/workspace", {
    headers: staffAuth,
  });
  assert.equal(workspace.response.status, 200);
  assert.equal(workspace.body.data.employee.id, "emp-002");
  assert.equal(
    workspace.body.data.summary.assignedOrders,
    workspace.body.data.orderQueue.filter((item) => item.assigneeId === "emp-002").length,
  );
  assert.equal(
    workspace.body.data.summary.availableOrders,
    workspace.body.data.orderQueue.filter((item) => !item.assigneeId).length,
  );
});

test("order state machine synchronizes delivery, inventory and notifications", async () => {
  const customerToken = await loginAs("demo@novawear.vn", "Demo@123");
  const adminToken = await loginAs("admin@novawear.vn", "Admin@123", "admin");
  const customerAuth = { Authorization: `Bearer ${customerToken}` };
  const adminAuth = { Authorization: `Bearer ${adminToken}` };
  const productBefore = await request("/products/prd-003");

  const created = await request("/orders", {
    method: "POST",
    headers: customerAuth,
    body: JSON.stringify({
      customer: {
        name: "Nguyễn Minh Anh",
        email: "demo@novawear.vn",
        phone: "0901234567",
        address: "12 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh",
      },
      addressConfirmation: { confirmed: true, address: "12 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh" },
      items: [{ productId: "prd-003", quantity: 1, size: "M", color: "Xanh sương" }],
      paymentMethod: "cod",
      shippingMethod: "standard",
    }),
  });
  assert.equal(created.response.status, 201);
  let order = created.body.data;

  const skipped = await request(`/admin/orders/${order.id}`, {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({
      expectedVersion: order.version,
      status: "shipping",
      shipment: { carrier: "GHN", trackingNumber: "GHN-SKIP-001" },
    }),
  });
  assert.equal(skipped.response.status, 409);

  for (const status of ["packing", "ready_to_ship"]) {
    const updated = await request(`/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: adminAuth,
      body: JSON.stringify({
        expectedVersion: order.version,
        status,
        publicNote: `Cập nhật ${status}.`,
        internalNote: "Ghi chú vận hành không được trả về phía khách hàng.",
      }),
    });
    assert.equal(updated.response.status, 200);
    order = updated.body.data;
  }

  const missingShipment = await request(`/admin/orders/${order.id}`, {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({ expectedVersion: order.version, status: "shipping" }),
  });
  assert.equal(missingShipment.response.status, 409);

  const shipped = await request(`/admin/orders/${order.id}`, {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({
      expectedVersion: order.version,
      status: "shipping",
      shipment: { carrier: "GHN", trackingNumber: "GHN-REAL-001" },
      publicNote: "Đơn đã được bàn giao cho GHN.",
    }),
  });
  assert.equal(shipped.response.status, 200);
  order = shipped.body.data;

  const failed = await request(`/admin/orders/${order.id}`, {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({
      expectedVersion: order.version,
      status: "delivery_failed",
      reason: "Khách hàng chưa thể nhận hàng trong khung giờ giao.",
    }),
  });
  assert.equal(failed.response.status, 200);
  order = failed.body.data;

  const retried = await request(`/admin/orders/${order.id}`, {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({ expectedVersion: order.version, status: "shipping", publicNote: "Đơn đang được giao lại." }),
  });
  assert.equal(retried.response.status, 200);
  assert.equal(retried.body.data.deliveryAttempts, 2);
  order = retried.body.data;

  const delivered = await request(`/admin/orders/${order.id}`, {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({ expectedVersion: order.version, status: "delivered", publicNote: "Khách hàng đã nhận đủ sản phẩm." }),
  });
  assert.equal(delivered.response.status, 200);
  assert.equal(delivered.body.data.paymentStatus, "paid");
  const storedDelivered = application.locals.store.data.orders.find((item) => item.id === order.id);
  storedDelivered.paymentStatus = "review_required";
  application.locals.store.save();
  const returnBeforeReconciliation = await request("/returns", {
    method: "POST",
    headers: customerAuth,
    body: JSON.stringify({
      orderId: order.id,
      type: "return",
      reason: "Kiểm tra chặn đổi trả trước khi hoàn tất đối soát.",
      items: [{
        productId: order.items[0].productId,
        size: order.items[0].size,
        color: order.items[0].color,
        quantity: 1,
      }],
    }),
  });
  assert.equal(returnBeforeReconciliation.response.status, 409);
  const reconciled = await request(`/admin/orders/${order.id}/payment-reconcile`, {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({
      expectedVersion: delivered.body.data.version,
      reference: "RC-TEST-0001",
      reason: "Đã đối chiếu sao kê và biên nhận giao hàng.",
    }),
  });
  assert.equal(reconciled.response.status, 200);
  assert.equal(reconciled.body.data.paymentStatus, "paid");
  const productAfter = await request("/products/prd-003");
  assert.equal(productAfter.body.data.stock, productBefore.body.data.stock - 1);

  const customerNotifications = await request("/notifications?limit=100", { headers: customerAuth });
  assert.equal(customerNotifications.response.status, 200);
  assert.ok(customerNotifications.body.data.some((item) => item.orderId === order.id && item.title.includes("Giao thành công")));
  assert.ok(customerNotifications.body.data.every((item) => !Object.hasOwn(item, "userId") && !Object.hasOwn(item, "customerId") && !Object.hasOwn(item, "readBy")));
  const unread = customerNotifications.body.data.find((item) => !item.readAt);
  const marked = await request(`/notifications/${unread.id}/read`, { method: "PATCH", headers: customerAuth, body: "{}" });
  assert.equal(marked.response.status, 200);
  assert.ok(marked.body.data.readAt);

  const operationsNotifications = await request("/notifications?limit=100", { headers: adminAuth });
  assert.ok(operationsNotifications.body.data.some((item) => item.orderId === order.id));
  const customerHistory = await request("/orders/my", { headers: customerAuth });
  const publicOrderData = customerHistory.body.data.find((item) => item.id === order.id);
  assert.equal(Object.hasOwn(publicOrderData, "internalNote"), false);
  assert.ok(publicOrderData.timeline.every((event) => !Object.hasOwn(event, "internalNote") && !Object.hasOwn(event, "actorId")));
  assert.equal(Object.hasOwn(publicOrderData, "paymentTransaction"), false);
  assert.equal(Object.hasOwn(publicOrderData, "paymentReconciliation"), false);
  assert.equal(Object.hasOwn(publicOrderData, "paymentReviewReason"), false);
  assert.equal(Object.hasOwn(publicOrderData, "userId"), false);
  assert.equal(Object.hasOwn(publicOrderData, "customerId"), false);
  assert.equal(Object.hasOwn(publicOrderData, "stockReservedAt"), false);
  assert.equal(publicOrderData.items[0].reviewStatus, "eligible");

  const submittedReview = await request(`/products/${publicOrderData.items[0].productId}/reviews`, {
    method: "POST",
    headers: customerAuth,
    body: JSON.stringify({
      rating: 5,
      content: "Sản phẩm đúng mô tả, phom vừa vặn và chất liệu mặc dễ chịu.",
      images: [],
    }),
  });
  assert.equal(submittedReview.response.status, 201);

  const historyAfterReview = await request("/orders/my", { headers: customerAuth });
  const reviewedOrder = historyAfterReview.body.data.find((item) => item.id === order.id);
  assert.equal(reviewedOrder.items[0].reviewStatus, "reviewed");

  const duplicateReview = await request(`/products/${publicOrderData.items[0].productId}/reviews`, {
    method: "POST",
    headers: customerAuth,
    body: JSON.stringify({
      rating: 4,
      content: "Đánh giá trùng cần bị hệ thống từ chối để bảo đảm dữ liệu chính xác.",
    }),
  });
  assert.equal(duplicateReview.response.status, 409);
});

test("cancellation and payment expiry restore stock exactly once", async () => {
  const customerToken = await loginAs("demo@novawear.vn", "Demo@123");
  const auth = { Authorization: `Bearer ${customerToken}` };
  const productBefore = await request("/products/prd-004");
  const customer = {
    name: "Nguyễn Minh Anh",
    email: "demo@novawear.vn",
    phone: "0901234567",
    address: "12 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh",
  };
  const created = await request("/orders", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      customer,
      addressConfirmation: confirmAddress(customer),
      items: [{ productId: "prd-004", quantity: 1, size: "M", color: "Xám khói" }],
      paymentMethod: "cod",
    }),
  });
  assert.equal(created.response.status, 201);
  const cancelled = await request(`/orders/${created.body.data.id}/cancel`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({
      expectedVersion: created.body.data.version,
      reason: "Tôi muốn thay đổi sản phẩm trong đơn hàng.",
    }),
  });
  assert.equal(cancelled.response.status, 200);
  assert.equal(cancelled.body.data.paymentStatus, "cancelled");
  const productAfterCancel = await request("/products/prd-004");
  assert.equal(productAfterCancel.body.data.stock, productBefore.body.data.stock);
  const duplicateCancel = await request(`/orders/${created.body.data.id}/cancel`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({ expectedVersion: cancelled.body.data.version, reason: "Hủy lại lần nữa." }),
  });
  assert.equal(duplicateCancel.response.status, 409);
  const productAfterDuplicate = await request("/products/prd-004");
  assert.equal(productAfterDuplicate.body.data.stock, productBefore.body.data.stock);

  const bankOrder = await request("/orders", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      customer,
      addressConfirmation: confirmAddress(customer),
      items: [{ productId: "prd-004", quantity: 1, size: "M", color: "Xám khói" }],
      paymentMethod: "bank",
    }),
  });
  assert.equal(bankOrder.response.status, 201);
  const stored = application.locals.store.data.orders.find((item) => item.id === bankOrder.body.data.id);
  stored.paymentExpiresAt = new Date(Date.now() - 1000).toISOString();
  application.locals.store.save();
  const history = await request("/orders/my", { headers: auth });
  const expired = history.body.data.find((item) => item.id === bankOrder.body.data.id);
  assert.equal(expired.status, "cancelled");
  assert.equal(expired.paymentStatus, "expired");
  const productAfterExpiry = await request("/products/prd-004");
  assert.equal(productAfterExpiry.body.data.stock, productBefore.body.data.stock);
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

test("guest chat is private and supports a two-way operations conversation", async () => {
  const created = await request("/chat/conversations", {
    method: "POST",
    body: JSON.stringify({
      name: "Guest Chat",
      email: "guest.chat@example.com",
      phone: "0912345678",
      message: "Shop tư vấn giúp tôi chọn size áo.",
    }),
  });
  assert.equal(created.response.status, 201);
  assert.ok(created.body.accessToken);
  assert.equal(created.body.data.channel, "chat");
  assert.equal(created.body.data.messages.length, 1);

  const conversationId = created.body.data.id;
  const blockedWithoutSecret = await request(`/chat/conversations/${conversationId}`);
  assert.equal(blockedWithoutSecret.response.status, 404);
  const blockedWithWrongSecret = await request(`/chat/conversations/${conversationId}`, {
    headers: { "X-Chat-Token": "wrong-secret" },
  });
  assert.equal(blockedWithWrongSecret.response.status, 404);

  const guestHeaders = { "X-Chat-Token": created.body.accessToken };
  const customerMessage = await request(`/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: guestHeaders,
    body: JSON.stringify({ message: "Tôi cao 1m70 và nặng 62kg." }),
  });
  assert.equal(customerMessage.response.status, 201);
  assert.equal(customerMessage.body.data.messages.length, 2);

  const adminToken = await loginAs("admin@novawear.vn", "Admin@123", "admin");
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const inbox = await request("/admin/contacts", { headers: adminHeaders });
  assert.equal(inbox.response.status, 200);
  const inboxConversation = inbox.body.data.find((item) => item.id === conversationId);
  assert.ok(inboxConversation);
  assert.equal(Object.hasOwn(inboxConversation, "guestTokenHash"), false);

  const opened = await request(`/admin/contacts/${conversationId}`, { headers: adminHeaders });
  assert.equal(opened.response.status, 200);
  assert.equal(opened.body.data.operationsUnreadCount, 0);
  const reply = await request(`/admin/contacts/${conversationId}/messages`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      message: "Với số đo này, bạn có thể bắt đầu với size M và kiểm tra thêm bảng size.",
    }),
  });
  assert.equal(reply.response.status, 201);
  assert.equal(reply.body.data.status, "in_progress");
  assert.equal(reply.body.data.customerUnreadCount, 1);

  const unreadForGuest = await request(`/chat/conversations/${conversationId}`, {
    headers: guestHeaders,
  });
  assert.equal(unreadForGuest.response.status, 200);
  assert.equal(unreadForGuest.body.data.customerUnreadCount, 1);
  assert.equal(unreadForGuest.body.data.messages.at(-1).sender, "operations");
  assert.equal(unreadForGuest.body.data.messages.at(-1).senderName, "NOVAWEAR");

  const markedRead = await request(`/chat/conversations/${conversationId}?markRead=true`, {
    headers: guestHeaders,
  });
  assert.equal(markedRead.response.status, 200);
  assert.equal(markedRead.body.data.customerUnreadCount, 0);
});

test("authenticated chat stays in one conversation after the customer changes their name", async () => {
  const email = "chat.identity@novawear.vn";
  const registered = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Original Chat Name",
      email,
      phone: "0909123001",
      password: "ChatIdentity@123",
    }),
  });
  assert.equal(registered.response.status, 201);

  const verified = await request("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ email, code: registered.body.verificationCode }),
  });
  assert.equal(verified.response.status, 200);
  const auth = { Authorization: `Bearer ${verified.body.token}` };

  const first = await request("/chat/conversations", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ message: "Tin nhắn đầu tiên của tài khoản." }),
  });
  assert.equal(first.response.status, 201);
  const conversationId = first.body.data.id;

  const storedConversation = application.locals.store.data.contacts
    .find((item) => item.id === conversationId);
  const legacyDuplicateId = "chat-legacy-same-account";
  application.locals.store.data.contacts.push({
    ...structuredClone(storedConversation),
    id: legacyDuplicateId,
    name: "Legacy Display Name",
    messages: [{
      id: "chat-legacy-message",
      sender: "customer",
      senderId: verified.body.user.id,
      senderName: "Legacy Display Name",
      body: "Tin nhắn nằm trong cuộc trò chuyện cũ.",
      createdAt: new Date(Date.now() - 60000).toISOString(),
    }],
    lastMessageAt: new Date(Date.now() - 60000).toISOString(),
  });

  const renamed = await request("/auth/me", {
    method: "PUT",
    headers: auth,
    body: JSON.stringify({ name: "Renamed Chat Customer" }),
  });
  assert.equal(renamed.response.status, 200);

  const continued = await request("/chat/conversations", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ message: "Tin nhắn sau khi đổi tên." }),
  });
  assert.equal(continued.response.status, 200);
  assert.equal(continued.body.reused, true);
  assert.equal(continued.body.data.id, conversationId);
  assert.equal(continued.body.data.name, "Renamed Chat Customer");
  assert.equal(continued.body.data.messages.length, 3);
  assert.ok(continued.body.data.messages
    .filter((message) => message.sender === "customer")
    .every((message) => message.senderName === "Renamed Chat Customer"));

  const legacySession = await request(`/chat/conversations/${legacyDuplicateId}`, {
    headers: auth,
  });
  assert.equal(legacySession.response.status, 200);
  assert.equal(legacySession.body.data.id, conversationId);

  const adminToken = await loginAs("admin@novawear.vn", "Admin@123", "admin");
  const inbox = await request("/admin/contacts", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const conversationsForAccount = inbox.body.data.filter((item) => (
    item.userId === verified.body.user.id && item.channel === "chat"
  ));
  assert.equal(conversationsForAccount.length, 1);
  assert.equal(conversationsForAccount[0].name, "Renamed Chat Customer");
});

test("coupon schedule and usage limits are enforced and restored after cancellation", async () => {
  const adminToken = await loginAs("admin@novawear.vn", "Admin@123", "admin");
  const adminAuth = { Authorization: `Bearer ${adminToken}` };
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const twoDaysFromNow = new Date(Date.now() + 2 * 86400000).toISOString();

  const futureCoupon = await request("/admin/coupons", {
    method: "POST",
    headers: adminAuth,
    body: JSON.stringify({
      code: "FUTURE1",
      type: "percent",
      value: 10,
      startsAt: tomorrow,
      expiresAt: twoDaysFromNow,
      usageLimit: 10,
    }),
  });
  assert.equal(futureCoupon.response.status, 201);

  const limitedCoupon = await request("/admin/coupons", {
    method: "POST",
    headers: adminAuth,
    body: JSON.stringify({
      code: "LIMIT1",
      type: "fixed",
      value: 10000,
      startsAt: yesterday,
      expiresAt: tomorrow,
      usageLimit: 1,
    }),
  });
  assert.equal(limitedCoupon.response.status, 201);

  const promotionsBefore = await request("/promotions");
  assert.equal(promotionsBefore.body.data.some((item) => item.code === "FUTURE1"), false);
  assert.equal(promotionsBefore.body.data.some((item) => item.code === "LIMIT1"), true);

  const futureValidation = await request("/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code: "FUTURE1", subtotal: 500000 }),
  });
  assert.equal(futureValidation.response.status, 409);
  assert.equal(futureValidation.body.code, "COUPON_NOT_STARTED");

  const customerToken = await loginAs("demo@novawear.vn", "Demo@123");
  const customerAuth = { Authorization: `Bearer ${customerToken}` };
  const product = application.locals.store.data.products.find((item) => (
    item.status === "active"
      && Number(item.stock || 0) >= 2
      && (!item.variants?.length || item.variants.some((variant) => Number(variant.stock || 0) >= 2))
  ));
  assert.ok(product);
  const variant = product.variants?.find((item) => Number(item.stock || 0) >= 2);
  const customerRecord = application.locals.store.data.customers
    .find((item) => item.id === application.locals.store.data.users
      .find((user) => user.email === "demo@novawear.vn").customerId);

  const firstOrder = await request("/orders", {
    method: "POST",
    headers: customerAuth,
    body: JSON.stringify({
      customer: {
        name: customerRecord.name,
        email: customerRecord.email,
        phone: customerRecord.phone,
        address: customerRecord.address || "Hà Nội",
      },
      addressConfirmation: { confirmed: true, address: customerRecord.address || "Hà Nội" },
      items: [{
        productId: product.id,
        quantity: 1,
        size: variant?.size || product.sizes?.[0] || "",
        color: variant?.color || product.colors?.[0] || "",
      }],
      paymentMethod: "cod",
      couponCode: "LIMIT1",
      requestId: `coupon-order-${Date.now()}`,
    }),
  });
  assert.equal(firstOrder.response.status, 201);
  assert.equal(application.locals.store.data.coupons.find((item) => item.code === "LIMIT1").usedCount, 1);

  const exhaustedValidation = await request("/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code: "LIMIT1", subtotal: 500000 }),
  });
  assert.equal(exhaustedValidation.response.status, 409);
  assert.equal(exhaustedValidation.body.code, "COUPON_USAGE_LIMIT_REACHED");
  const promotionsExhausted = await request("/promotions");
  assert.equal(promotionsExhausted.body.data.some((item) => item.code === "LIMIT1"), false);

  const cancelled = await request(`/orders/${firstOrder.body.data.id}/cancel`, {
    method: "PATCH",
    headers: customerAuth,
    body: JSON.stringify({
      expectedVersion: firstOrder.body.data.version,
      reason: "Không còn nhu cầu mua sản phẩm.",
    }),
  });
  assert.equal(cancelled.response.status, 200);
  assert.equal(application.locals.store.data.coupons.find((item) => item.code === "LIMIT1").usedCount, 0);
  const promotionsRestored = await request("/promotions");
  assert.equal(promotionsRestored.body.data.some((item) => item.code === "LIMIT1"), true);
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

test("security boundaries prevent token bypass, privilege escalation and stale sessions", async () => {
  const verificationBypass = await request("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ email: "demo@novawear.vn", code: "000000" }),
  });
  assert.equal(verificationBypass.response.status, 409);
  assert.equal(verificationBypass.body.code, "ACCOUNT_ALREADY_VERIFIED");
  assert.equal(verificationBypass.body.token, undefined);

  const customerToken = await loginAs("demo@novawear.vn", "Demo@123");
  const internalCustomer = application.locals.store.data.users.find((item) => item.email === "demo@novawear.vn");
  internalCustomer.passwordResetCodeHash = "must-not-leak";
  internalCustomer.passwordResetExpiresAt = new Date(Date.now() + 60000).toISOString();
  internalCustomer.googleId = "private-provider-id";
  const safeProfile = await request("/auth/me", {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.equal(safeProfile.response.status, 200);
  assert.equal(Object.hasOwn(safeProfile.body.user, "passwordResetCodeHash"), false);
  assert.equal(Object.hasOwn(safeProfile.body.user, "passwordResetExpiresAt"), false);
  assert.equal(Object.hasOwn(safeProfile.body.user, "tokenVersion"), false);
  assert.equal(Object.hasOwn(safeProfile.body.user, "googleId"), false);

  const staffToken = await loginAs("staff@novawear.vn", "Staff@123", "admin");
  const staffAuth = { Authorization: `Bearer ${staffToken}` };
  const deniedEmployees = await request("/admin/employees", { headers: staffAuth });
  assert.equal(deniedEmployees.response.status, 403);
  const deniedOverview = await request("/admin/overview", { headers: staffAuth });
  assert.equal(deniedOverview.response.status, 403);
  for (const protectedPath of ["/admin/news", "/admin/coupons", "/admin/suppliers"]) {
    const protectedResult = await request(protectedPath, { headers: staffAuth });
    assert.equal(protectedResult.response.status, 403);
  }
  const deniedProductEdit = await request("/admin/products/prd-001", {
    method: "PUT",
    headers: staffAuth,
    body: JSON.stringify({ name: "Unauthorized edit" }),
  });
  assert.equal(deniedProductEdit.response.status, 403);
  const deniedLegacyEmployees = await request("/getallnv", { headers: staffAuth });
  assert.equal(deniedLegacyEmployees.response.status, 403);

  const publicLegacyProducts = await request("/getallsp");
  assert.equal(publicLegacyProducts.response.status, 200);
  assert.ok(publicLegacyProducts.body.length > 0);
  assert.ok(publicLegacyProducts.body.every((item) => !Object.hasOwn(item, "cost")));

  const adminToken = await loginAs("admin@novawear.vn", "Admin@123", "admin");
  const adminAuth = { Authorization: `Bearer ${adminToken}` };
  const selfMutation = await request("/admin/users/usr-admin", {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({ status: "inactive" }),
  });
  assert.equal(selfMutation.response.status, 409);
  const selfEmployeeDeactivation = await request("/admin/employees/emp-001", {
    method: "DELETE",
    headers: adminAuth,
  });
  assert.equal(selfEmployeeDeactivation.response.status, 409);
  const customerPromotion = await request("/admin/users/usr-demo", {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({ role: "admin" }),
  });
  assert.equal(customerPromotion.response.status, 400);
  const manualVerification = await request("/admin/users/usr-demo", {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({ verified: false }),
  });
  assert.equal(manualVerification.response.status, 400);

  const duplicateEmployee = await request("/admin/employees", {
    method: "POST",
    headers: adminAuth,
    body: JSON.stringify({
      name: "Duplicate Customer",
      email: "demo@novawear.vn",
      phone: "0909123456",
      createAccount: true,
      temporaryPassword: "Temporary@2026!",
    }),
  });
  assert.equal(duplicateEmployee.response.status, 409);

  const weakEmployee = await request("/admin/employees", {
    method: "POST",
    headers: adminAuth,
    body: JSON.stringify({
      name: "Weak Password Staff",
      email: "weak.staff@novawear.vn",
      phone: "0909123457",
      createAccount: true,
      temporaryPassword: "Welcome123",
    }),
  });
  assert.equal(weakEmployee.response.status, 400);

  const createdEmployee = await request("/admin/employees", {
    method: "POST",
    headers: adminAuth,
    body: JSON.stringify({
      name: "Secure Test Staff",
      email: "secure.staff@novawear.vn",
      phone: "0909123458",
      createAccount: true,
      accountRole: "staff",
      temporaryPassword: "InitialOps@2026!",
    }),
  });
  assert.equal(createdEmployee.response.status, 201);

  const temporaryToken = await loginAs("secure.staff@novawear.vn", "InitialOps@2026!", "admin");
  const blockedUntilPasswordChange = await request("/admin/orders", {
    headers: { Authorization: `Bearer ${temporaryToken}` },
  });
  assert.equal(blockedUntilPasswordChange.response.status, 403);
  assert.equal(blockedUntilPasswordChange.body.code, "PASSWORD_CHANGE_REQUIRED");
  const changedPassword = await request("/auth/password", {
    method: "PUT",
    headers: { Authorization: `Bearer ${temporaryToken}` },
    body: JSON.stringify({
      currentPassword: "InitialOps@2026!",
      newPassword: "PrivateOps@2026!",
    }),
  });
  assert.equal(changedPassword.response.status, 200);
  assert.equal(changedPassword.body.user.mustChangePassword, false);
  const staleTemporaryToken = await request("/auth/me", {
    headers: { Authorization: `Bearer ${temporaryToken}` },
  });
  assert.equal(staleTemporaryToken.response.status, 401);
  const allowedAfterPasswordChange = await request("/admin/orders", {
    headers: { Authorization: `Bearer ${changedPassword.body.token}` },
  });
  assert.equal(allowedAfterPasswordChange.response.status, 200);

  const staffInbox = await request("/admin/contacts", { headers: staffAuth });
  assert.equal(staffInbox.response.status, 200);
  assert.ok(staffInbox.body.data.length > 0);
  const claimedContact = await request(`/admin/contacts/${staffInbox.body.data[0].id}`, {
    method: "PATCH",
    headers: staffAuth,
    body: JSON.stringify({ status: "in_progress" }),
  });
  assert.equal(claimedContact.response.status, 200);
  assert.equal(claimedContact.body.data.assigneeId, "usr-staff");

  const secondStaffAuth = { Authorization: `Bearer ${changedPassword.body.token}` };
  const scopedInbox = await request("/admin/contacts", { headers: secondStaffAuth });
  assert.equal(scopedInbox.response.status, 200);
  assert.equal(scopedInbox.body.data.some((item) => item.id === claimedContact.body.data.id), false);
  const deniedContactTakeover = await request(`/admin/contacts/${claimedContact.body.data.id}`, {
    method: "PATCH",
    headers: secondStaffAuth,
    body: JSON.stringify({ status: "resolved" }),
  });
  assert.equal(deniedContactTakeover.response.status, 403);

  const loggedOut = await request("/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${changedPassword.body.token}` },
  });
  assert.equal(loggedOut.response.status, 200);
  const revokedAfterLogout = await request("/auth/me", {
    headers: { Authorization: `Bearer ${changedPassword.body.token}` },
  });
  assert.equal(revokedAfterLogout.response.status, 401);
});

test("password reset uses an emailed one-time code and revokes old sessions", async () => {
  const email = "password.reset@novawear.vn";
  const registered = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Password Reset Customer",
      email,
      phone: "0909000012",
      password: "BeforeReset@123",
    }),
  });
  assert.equal(registered.response.status, 201);

  const verified = await request("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ email, code: registered.body.verificationCode }),
  });
  assert.equal(verified.response.status, 200);

  const resetRequest = await request("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  assert.equal(resetRequest.response.status, 200);
  assert.match(resetRequest.body.resetCode, /^\d{6}$/);
  assert.ok(sentEmails.some((item) => (
    item.type === "verification"
      && item.to === email
      && item.purpose === "password-reset"
      && item.code === resetRequest.body.resetCode
  )));

  const reset = await request("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({
      email,
      code: resetRequest.body.resetCode,
      newPassword: "AfterReset@456",
    }),
  });
  assert.equal(reset.response.status, 200);

  const revoked = await request("/auth/me", {
    headers: { Authorization: `Bearer ${verified.body.token}` },
  });
  assert.equal(revoked.response.status, 401);

  const oldPassword = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "BeforeReset@123" }),
  });
  assert.equal(oldPassword.response.status, 401);

  const newPassword = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "AfterReset@456" }),
  });
  assert.equal(newPassword.response.status, 200);
  assert.ok(newPassword.body.token);
});

test("production identity policy disables demo logins and bootstraps a private admin", () => {
  const identityStore = new JsonStore(path.join(tempDir, "production-identity.json"));
  const result = enforceProductionIdentityPolicy(identityStore, {
    production: true,
    allowDemoAccounts: false,
    bootstrapEmail: "owner@novawear.vn",
    bootstrapPassword: "PrivateOwner@2026!",
    bootstrapPasswordVersion: "1",
    bootstrapName: "NOVA Owner",
    bootstrapPhone: "0909000099",
  });

  assert.equal(result.demoAccountsDisabled, true);
  assert.ok(identityStore.data.users
    .filter((user) => ["admin@novawear.vn", "staff@novawear.vn", "demo@novawear.vn"].includes(user.email))
    .every((user) => user.status === "inactive"));
  const owner = identityStore.data.users.find((user) => user.email === "owner@novawear.vn");
  assert.equal(owner.role, "admin");
  assert.equal(owner.status, "active");
  assert.equal(verifyPassword("PrivateOwner@2026!", owner.passwordHash), true);
});

test("production identity policy refuses known demo accounts", () => {
  const identityStore = new JsonStore(path.join(tempDir, "production-demo-refusal.json"));
  assert.throws(
    () => enforceProductionIdentityPolicy(identityStore, {
      production: true,
      allowDemoAccounts: true,
    }),
    /ALLOW_DEMO_ACCOUNTS/,
  );
});

test("admin can manage catalog, inventory and purchase receiving", async () => {
  const token = await loginAs("admin@novawear.vn", "Admin@123", "admin");
  const auth = { Authorization: `Bearer ${token}` };

  const firstPage = await request("/admin/products?page=1&limit=5", { headers: auth });
  assert.equal(firstPage.response.status, 200);
  assert.equal(firstPage.body.data.length, 5);
  assert.equal(firstPage.body.pagination.page, 1);
  assert.equal(firstPage.body.pagination.limit, 5);
  assert.ok(firstPage.body.pagination.total >= 5);
  assert.ok(firstPage.body.pagination.totalPages > 1);
  assert.equal(firstPage.body.summary.total, firstPage.body.pagination.total);
  assert.ok(firstPage.body.summary.totalStock > 0);

  const unpaginated = await request("/admin/products?status=active", { headers: auth });
  assert.equal(unpaginated.response.status, 200);
  assert.equal(unpaginated.body.data.length, unpaginated.body.pagination.total);

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

  const orderBeforeDelivery = await request("/admin/orders/ORD-2026-001", { headers: adminAuth });
  assert.equal(orderBeforeDelivery.response.status, 200);

  const delivered = await request("/admin/orders/ORD-2026-001", {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({ status: "delivered", expectedVersion: orderBeforeDelivery.body.data.version }),
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

  const secureEmployee = application.locals.store.data.employees
    .find((item) => item.email === "secure.staff@novawear.vn");
  assert.ok(secureEmployee);
  const approved = await request(`/admin/returns/${created.body.data.id}`, {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({
      status: "approved",
      assigneeId: secureEmployee.id,
      expectedVersion: created.body.data.version,
      publicNote: "Yêu cầu hợp lệ, vui lòng gửi sản phẩm về NOVAWEAR.",
      internalNote: "Đã đối chiếu đơn hàng và điều kiện đổi trả.",
    }),
  });
  assert.equal(approved.response.status, 200);
  assert.equal(approved.body.data.assigneeId, secureEmployee.id);

  const staffToken = await loginAs("staff@novawear.vn", "Staff@123", "admin");
  const staffAuth = { Authorization: `Bearer ${staffToken}` };
  const scopedReturns = await request("/admin/returns", { headers: staffAuth });
  assert.equal(scopedReturns.response.status, 200);
  assert.equal(scopedReturns.body.data.some((item) => item.id === created.body.data.id), false);
  const deniedReturnTakeover = await request(`/admin/returns/${created.body.data.id}`, {
    method: "PATCH",
    headers: staffAuth,
    body: JSON.stringify({
      status: "receiving",
      expectedVersion: approved.body.data.version,
    }),
  });
  assert.equal(deniedReturnTakeover.response.status, 403);
  const scopedReturnNotifications = await request("/notifications", { headers: staffAuth });
  assert.equal(scopedReturnNotifications.response.status, 200);
  assert.equal(scopedReturnNotifications.body.data.some((item) => item.returnId === created.body.data.id), false);

  let currentReturn = approved.body.data;
  for (const status of ["receiving", "inspecting", "completed"]) {
    const update = await request(`/admin/returns/${created.body.data.id}`, {
      method: "PATCH",
      headers: adminAuth,
      body: JSON.stringify({
        status,
        expectedVersion: currentReturn.version,
        publicNote: "Đã cập nhật bước xử lý.",
        internalNote: status === "completed" ? "Sản phẩm còn nguyên tem và đạt điều kiện nhập kho." : "Đang xử lý theo quy trình.",
        inventoryDisposition: status === "completed" ? "restock" : undefined,
      }),
    });
    assert.equal(update.response.status, 200);
    assert.equal(update.body.data.status, status);
    currentReturn = update.body.data;
  }

  assert.equal(currentReturn.refundStatus, "pending");
  const refunded = await request(`/admin/returns/${created.body.data.id}/refund`, {
    method: "PATCH",
    headers: adminAuth,
    body: JSON.stringify({
      expectedVersion: currentReturn.version,
      reference: "RF-TEST-0001",
      internalNote: "Đã đối soát giao dịch hoàn tiền thành công.",
    }),
  });
  assert.equal(refunded.response.status, 200);
  assert.equal(refunded.body.data.refundStatus, "refunded");

  const history = await request("/returns/my", { headers: customerAuth });
  assert.equal(history.response.status, 200);
  assert.equal(history.body.data[0].status, "completed");
  assert.equal(history.body.data[0].refundStatus, "refunded");
  assert.equal(Object.hasOwn(history.body.data[0], "userId"), false);
  assert.equal(Object.hasOwn(history.body.data[0], "customerId"), false);
  assert.equal(Object.hasOwn(history.body.data[0], "inspectionResult"), false);
  assert.equal(Object.hasOwn(history.body.data[0], "inventoryDisposition"), false);
  assert.ok(history.body.data[0].timeline.every((event) => !Object.hasOwn(event, "internalNote") && !Object.hasOwn(event, "actorId")));
});
