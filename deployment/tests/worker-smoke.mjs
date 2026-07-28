import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4173";

async function request(pathname, options = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    if (response.status === 503 && text.includes("worker restarted mid-request") && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    if (!response.ok) {
      throw new Error(`${options.method || "GET"} ${pathname} -> ${response.status}: ${text}`);
    }
    return body;
  }
  throw new Error(`${options.method || "GET"} ${pathname} failed after retries`);
}

async function login(email, password, portal) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, ...(portal ? { portal } : {}) }),
  });
}

const home = await fetch(`${baseUrl}/`).then((response) => response.text());
const ops = await fetch(`${baseUrl}/ops/login`).then((response) => response.text());
assert.match(home, /NOVAWEAR/);
assert.match(home, new RegExp(`${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\/og\.png`));
assert.match(ops, /NOVA OPS/);

const health = await request("/api/health");
assert.equal(health.status, "ok");

const catalog = await request("/api/products?featured=true&limit=2");
assert.equal(catalog.data.length, 2);
const product = catalog.data[0];

const customerLogin = await login("demo@novawear.vn", "Demo@123");
const customerAuth = { authorization: `Bearer ${customerLogin.token}` };
const coupon = await request("/api/coupons/validate", {
  method: "POST",
  body: JSON.stringify({ code: "NOVA10", subtotal: 800000 }),
});
assert.equal(coupon.data.discount, 80000);

const order = await request("/api/orders", {
  method: "POST",
  headers: customerAuth,
  body: JSON.stringify({
    customer: {
      name: "Khách Hàng Kiểm Thử",
      email: "demo@novawear.vn",
      phone: "0901234567",
      address: "12 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh",
    },
    items: [{
      productId: product.id,
      quantity: 1,
      size: product.sizes[0],
      color: product.colors[0],
    }],
    paymentMethod: "cod",
    couponCode: "",
  }),
});
const history = await request("/api/orders/my", { headers: customerAuth });
assert.ok(history.data.some((item) => item.id === order.data.id));
const cancelled = await request(`/api/orders/${order.data.id}/cancel`, {
  method: "PATCH",
  headers: customerAuth,
  body: "{}",
});
assert.equal(cancelled.data.status, "cancelled");

const staffLogin = await login("staff@novawear.vn", "Staff@123", "admin");
const staffAuth = { authorization: `Bearer ${staffLogin.token}` };
const workspace = await request("/api/staff/workspace", { headers: staffAuth });
assert.equal(workspace.data.employee.id, "emp-002");
if (workspace.data.tasks.length) {
  const updatedTask = await request(`/api/staff/tasks/${workspace.data.tasks[0].id}`, {
    method: "PATCH",
    headers: staffAuth,
    body: JSON.stringify({ status: "done" }),
  });
  assert.equal(updatedTask.data.status, "done");
}

const adminLogin = await login("admin@novawear.vn", "Admin@123", "admin");
const adminAuth = { authorization: `Bearer ${adminLogin.token}` };
const sku = `NW-SMOKE-${Date.now()}`;
const created = await request("/api/admin/products", {
  method: "POST",
  headers: adminAuth,
  body: JSON.stringify({
    name: "Sản phẩm kiểm thử triển khai",
    sku,
    categoryId: product.categoryId,
    price: 299000,
    cost: 120000,
    stock: 10,
    status: "active",
    sizes: ["M"],
    colors: ["Navy"],
  }),
});
const adjusted = await request("/api/admin/inventory/adjust", {
  method: "POST",
  headers: adminAuth,
  body: JSON.stringify({ productId: created.data.id, quantity: 5 }),
});
assert.equal(adjusted.data.stock, 15);
const purchase = await request("/api/admin/purchase-orders", {
  method: "POST",
  headers: adminAuth,
  body: JSON.stringify({
    supplier: "Nhà cung cấp kiểm thử",
    items: [{ productId: created.data.id, quantity: 4, unitCost: 115000 }],
  }),
});
await request(`/api/admin/purchase-orders/${purchase.data.id}/receive`, {
  method: "PATCH",
  headers: adminAuth,
  body: "{}",
});
await request(`/api/admin/products/${created.data.id}`, {
  method: "DELETE",
  headers: adminAuth,
});

console.log(JSON.stringify({
  storefront: "ok",
  operationsPortal: "ok",
  persistentApi: "ok",
  customerOrderFlow: "ok",
  staffWorkspace: "ok",
  adminInventoryFlow: "ok",
}));
