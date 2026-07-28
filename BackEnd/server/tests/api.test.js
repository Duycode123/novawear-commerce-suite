const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createApp } = require("../app");

let server;
let baseUrl;
let tempDir;

test.before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "novawear-api-"));
  const app = createApp({ dataFile: path.join(tempDir, "store.json") });
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
  assert.ok(result.body.token);
  return result.body.token;
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

  const history = await request("/orders/my", {
    headers: { Authorization: `Bearer ${login.body.token}` },
  });
  assert.equal(history.response.status, 200);
  assert.ok(history.body.data.some((item) => item.id === order.body.data.id));
});

test("staff portal is protected and supports order workflow", async () => {
  const denied = await request("/admin/overview");
  assert.equal(denied.response.status, 401);

  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "staff@novawear.vn", password: "Staff@123", portal: "admin" }),
  });
  assert.equal(login.response.status, 200);

  const overview = await request("/admin/overview", {
    headers: { Authorization: `Bearer ${login.body.token}` },
  });
  assert.equal(overview.response.status, 200);
  assert.ok(overview.body.data.orderCount >= 4);

  const update = await request("/admin/orders/ORD-2026-004", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${login.body.token}` },
    body: JSON.stringify({ status: "confirmed", assigneeId: "emp-002" }),
  });
  assert.equal(update.response.status, 200);
  assert.equal(update.body.data.status, "confirmed");

  const workspace = await request("/staff/workspace", {
    headers: { Authorization: `Bearer ${login.body.token}` },
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

  const profile = await request("/auth/me", {
    method: "PUT",
    headers: { Authorization: `Bearer ${register.body.token}` },
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
