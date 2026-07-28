import {
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
  allowed,
  asMoney,
  asPositiveInt,
  audit,
  fail,
  hashPassword,
  json,
  nextId,
  normalizeText,
  publicProduct,
  readBody,
  sanitizeUser,
  saveState,
  slugify,
} from "./core";
import type { Env, State, User } from "./types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+\s.-]{9,15}$/;

function accessFailure(user: User | null): Response {
  return user ? fail(403, "Bạn không có quyền thực hiện thao tác này.") : fail(401, "Vui lòng đăng nhập.");
}

function isAdmin(user: User | null): user is User {
  return allowed(user, ["admin"]);
}

export async function handleOpsApi(
  request: Request,
  url: URL,
  state: State,
  user: User | null,
  env: Env,
): Promise<Response | null> {
  const method = request.method;
  const pathname = url.pathname;

  if (pathname.startsWith("/api/admin/")) {
    if (!allowed(user, ["admin", "staff"])) return accessFailure(user);

    if (method === "GET" && pathname === "/api/admin/overview") {
      const activeOrders = state.orders.filter((item: any) => item.status !== "cancelled");
      const today = new Date().toISOString().slice(0, 10);
      const revenue = activeOrders.reduce((sum: number, item: any) => sum + item.total, 0);
      const todayRevenue = activeOrders
        .filter((item: any) => item.createdAt.slice(0, 10) === today)
        .reduce((sum: number, item: any) => sum + item.total, 0);
      const revenueByDay = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        const key = date.toISOString().slice(0, 10);
        return {
          date: key,
          label: date.toLocaleDateString("vi-VN", { weekday: "short" }),
          value: activeOrders
            .filter((item: any) => item.createdAt.slice(0, 10) === key)
            .reduce((sum: number, item: any) => sum + item.total, 0),
        };
      });
      const statusCounts = Object.keys(ORDER_STATUS_LABELS).reduce((result: Record<string, number>, status) => {
        result[status] = state.orders.filter((item: any) => item.status === status).length;
        return result;
      }, {});
      return json({
        data: {
          revenue,
          todayRevenue,
          orderCount: state.orders.length,
          customerCount: state.customers.length,
          productCount: state.products.filter((item: any) => item.status !== "archived").length,
          lowStockCount: state.products.filter((item: any) => item.status === "active" && item.stock <= 20).length,
          pendingCount: statusCounts.pending,
          revenueByDay,
          statusCounts,
          recentOrders: [...state.orders]
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 6),
          topProducts: [...state.products]
            .sort((a: any, b: any) => b.sold - a.sold)
            .slice(0, 5)
            .map((item: any) => publicProduct(item, state.categories)),
          lowStock: state.products
            .filter((item: any) => item.status === "active" && item.stock <= 20)
            .sort((a: any, b: any) => a.stock - b.stock)
            .slice(0, 6),
        },
      });
    }

    if (method === "GET" && pathname === "/api/admin/products") {
      const search = normalizeText(url.searchParams.get("search"));
      const categoryId = String(url.searchParams.get("categoryId") || "");
      const status = String(url.searchParams.get("status") || "all");
      let products = [...state.products];
      if (search) products = products.filter((item: any) => normalizeText(`${item.name} ${item.sku}`).includes(search));
      if (categoryId) products = products.filter((item: any) => item.categoryId === categoryId);
      if (status !== "all") products = products.filter((item: any) => item.status === status);
      return json({
        data: products.map((item: any) => ({
          ...item,
          category: state.categories.find((category: any) => category.id === item.categoryId) || null,
        })),
      });
    }

    if (method === "POST" && pathname === "/api/admin/products") {
      if (!isAdmin(user)) return accessFailure(user);
      const body = await readBody(request);
      const name = String(body.name || "").trim();
      const sku = String(body.sku || "").trim().toUpperCase();
      const categoryId = String(body.categoryId || "");
      if (name.length < 3 || !sku || !state.categories.some((item: any) => item.id === categoryId)) {
        return fail(400, "Tên, SKU hoặc danh mục sản phẩm chưa hợp lệ.");
      }
      if (state.products.some((item: any) => normalizeText(item.sku) === normalizeText(sku))) {
        return fail(409, "SKU đã tồn tại.");
      }
      const product = {
        id: nextId("prd-"),
        sku,
        name,
        slug: slugify(body.slug || name),
        categoryId,
        price: asMoney(body.price),
        comparePrice: asMoney(body.comparePrice),
        cost: asMoney(body.cost),
        stock: asMoney(body.stock),
        status: ["active", "draft", "archived"].includes(body.status) ? body.status : "draft",
        featured: Boolean(body.featured),
        badge: String(body.badge || ""),
        image: String(body.image || "/Images/11-0_672x990.jpg"),
        images: Array.isArray(body.images) && body.images.length ? body.images : [String(body.image || "/Images/11-0_672x990.jpg")],
        colors: Array.isArray(body.colors) ? body.colors : String(body.colors || "").split(",").map((item) => item.trim()).filter(Boolean),
        sizes: Array.isArray(body.sizes) ? body.sizes : String(body.sizes || "").split(",").map((item) => item.trim()).filter(Boolean),
        description: String(body.description || ""),
        materials: String(body.materials || ""),
        care: String(body.care || ""),
        rating: 0,
        reviewCount: 0,
        sold: 0,
        createdAt: new Date().toISOString(),
      };
      state.products.push(product);
      audit(state, "create", "product", product.id, user);
      await saveState(env, state);
      return json({ message: "Đã tạo sản phẩm.", data: product }, 201);
    }

    const adminProductMatch = pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
    if (adminProductMatch && method === "PUT") {
      const product = state.products.find((item: any) => item.id === decodeURIComponent(adminProductMatch[1]));
      if (!product) return fail(404, "Sản phẩm không tồn tại.");
      const body = await readBody(request);
      const allowedFields = ["name", "sku", "categoryId", "price", "comparePrice", "cost", "stock", "status", "featured", "badge", "image", "images", "colors", "sizes", "description", "materials", "care"];
      for (const field of allowedFields) if (body[field] !== undefined) product[field] = body[field];
      product.name = String(product.name || "").trim();
      product.sku = String(product.sku || "").trim().toUpperCase();
      product.slug = slugify(body.slug || product.name);
      for (const field of ["price", "comparePrice", "cost", "stock"]) product[field] = asMoney(product[field]);
      if (!product.name || !product.sku) return fail(400, "Tên và SKU là bắt buộc.");
      audit(state, "update", "product", product.id, user);
      await saveState(env, state);
      return json({ message: "Đã cập nhật sản phẩm.", data: product });
    }

    if (adminProductMatch && method === "DELETE") {
      if (!isAdmin(user)) return accessFailure(user);
      const product = state.products.find((item: any) => item.id === decodeURIComponent(adminProductMatch[1]));
      if (!product) return fail(404, "Sản phẩm không tồn tại.");
      if (state.orders.some((order: any) => order.items.some((item: any) => item.productId === product.id))) {
        product.status = "archived";
        audit(state, "archive", "product", product.id, user);
        await saveState(env, state);
        return json({ message: "Sản phẩm đã có giao dịch nên được chuyển vào lưu trữ.", data: product });
      }
      state.products = state.products.filter((item: any) => item.id !== product.id);
      audit(state, "delete", "product", product.id, user);
      await saveState(env, state);
      return json({ message: "Đã xóa sản phẩm." });
    }

    if (method === "GET" && pathname === "/api/admin/categories") {
      return json({
        data: state.categories.map((item: any) => ({
          ...item,
          productCount: state.products.filter((product: any) => product.categoryId === item.id && product.status !== "archived").length,
        })),
      });
    }

    if (method === "POST" && pathname === "/api/admin/categories") {
      if (!isAdmin(user)) return accessFailure(user);
      const body = await readBody(request);
      const name = String(body.name || "").trim();
      const slug = slugify(body.slug || name);
      if (name.length < 2) return fail(400, "Tên danh mục chưa hợp lệ.");
      if (state.categories.some((item: any) => item.slug === slug)) return fail(409, "Danh mục đã tồn tại.");
      const category = {
        id: nextId("cat-"),
        name,
        slug,
        description: String(body.description || ""),
        status: "active",
      };
      state.categories.push(category);
      audit(state, "create", "category", category.id, user);
      await saveState(env, state);
      return json({ message: "Đã tạo danh mục.", data: category }, 201);
    }

    const categoryMatch = pathname.match(/^\/api\/admin\/categories\/([^/]+)$/);
    if (categoryMatch && method === "PUT") {
      if (!isAdmin(user)) return accessFailure(user);
      const category = state.categories.find((item: any) => item.id === decodeURIComponent(categoryMatch[1]));
      if (!category) return fail(404, "Danh mục không tồn tại.");
      const body = await readBody(request);
      if (body.name !== undefined) category.name = String(body.name).trim();
      if (body.description !== undefined) category.description = String(body.description);
      if (body.status !== undefined) category.status = String(body.status);
      category.slug = slugify(body.slug || category.name);
      audit(state, "update", "category", category.id, user);
      await saveState(env, state);
      return json({ message: "Đã cập nhật danh mục.", data: category });
    }

    if (categoryMatch && method === "DELETE") {
      if (!isAdmin(user)) return accessFailure(user);
      const category = state.categories.find((item: any) => item.id === decodeURIComponent(categoryMatch[1]));
      if (!category) return fail(404, "Danh mục không tồn tại.");
      if (state.products.some((item: any) => item.categoryId === category.id && item.status !== "archived")) {
        return fail(409, "Không thể xóa danh mục đang có sản phẩm.");
      }
      state.categories = state.categories.filter((item: any) => item.id !== category.id);
      audit(state, "delete", "category", category.id, user);
      await saveState(env, state);
      return json({ message: "Đã xóa danh mục." });
    }

    if (method === "GET" && pathname === "/api/admin/orders") {
      const search = normalizeText(url.searchParams.get("search"));
      const status = String(url.searchParams.get("status") || "all");
      let orders = [...state.orders];
      if (status !== "all") orders = orders.filter((item: any) => item.status === status);
      if (search) {
        orders = orders.filter((item: any) => normalizeText(`${item.id} ${item.trackingCode} ${item.customer.name} ${item.customer.phone}`).includes(search));
      }
      orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return json({ data: orders });
    }

    const adminOrderMatch = pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
    if (adminOrderMatch && method === "GET") {
      const order = state.orders.find((item: any) => item.id === decodeURIComponent(adminOrderMatch[1]));
      return order ? json({ data: order }) : fail(404, "Đơn hàng không tồn tại.");
    }

    if (adminOrderMatch && method === "PATCH") {
      const order = state.orders.find((item: any) => item.id === decodeURIComponent(adminOrderMatch[1]));
      if (!order) return fail(404, "Đơn hàng không tồn tại.");
      const body = await readBody(request);
      const nextStatus = body.status;
      if (nextStatus && nextStatus !== order.status) {
        if (!ORDER_STATUS_LABELS[nextStatus]) return fail(400, "Trạng thái không hợp lệ.");
        if (!isAdmin(user) && !(ORDER_TRANSITIONS[order.status] || []).includes(nextStatus)) {
          return fail(409, "Không thể chuyển sang trạng thái đã chọn.");
        }
        if (nextStatus === "cancelled" && order.status !== "cancelled") {
          for (const line of order.items) {
            const product = state.products.find((item: any) => item.id === line.productId);
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
      if (["pending", "awaiting", "paid", "refunded", "failed"].includes(body.paymentStatus)) order.paymentStatus = body.paymentStatus;
      if (body.assigneeId !== undefined) {
        const assignee = state.employees.find((item: any) => item.id === body.assigneeId && item.status === "active");
        order.assigneeId = assignee ? assignee.id : null;
      }
      if (body.note !== undefined) order.internalNote = String(body.note).slice(0, 500);
      order.updatedAt = new Date().toISOString();
      audit(state, "update", "order", order.id, user);
      await saveState(env, state);
      return json({ message: "Đã cập nhật đơn hàng.", data: order });
    }

    if (method === "GET" && pathname === "/api/admin/customers") {
      const search = normalizeText(url.searchParams.get("search"));
      let customers = [...state.customers];
      if (search) customers = customers.filter((item: any) => normalizeText(`${item.name} ${item.email} ${item.phone}`).includes(search));
      customers.sort((a: any, b: any) => b.totalSpent - a.totalSpent);
      return json({ data: customers });
    }

    if (method === "POST" && pathname === "/api/admin/customers") {
      const body = await readBody(request);
      const customer = {
        id: nextId("cus-"),
        name: String(body.name || "").trim(),
        email: normalizeText(body.email),
        phone: String(body.phone || "").trim(),
        address: String(body.address || "").trim(),
        tier: body.tier || "Member",
        totalSpent: 0,
        orderCount: 0,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      if (customer.name.length < 2 || !phonePattern.test(customer.phone) || (customer.email && !emailPattern.test(customer.email))) {
        return fail(400, "Thông tin khách hàng chưa hợp lệ.");
      }
      state.customers.push(customer);
      audit(state, "create", "customer", customer.id, user);
      await saveState(env, state);
      return json({ message: "Đã thêm khách hàng.", data: customer }, 201);
    }

    const customerMatch = pathname.match(/^\/api\/admin\/customers\/([^/]+)$/);
    if (customerMatch && method === "PUT") {
      const customer = state.customers.find((item: any) => item.id === decodeURIComponent(customerMatch[1]));
      if (!customer) return fail(404, "Khách hàng không tồn tại.");
      const body = await readBody(request);
      for (const field of ["name", "email", "phone", "address", "tier", "status"]) {
        if (body[field] !== undefined) customer[field] = String(body[field]).trim();
      }
      if (!customer.name || !phonePattern.test(customer.phone) || (customer.email && !emailPattern.test(customer.email))) {
        return fail(400, "Thông tin khách hàng chưa hợp lệ.");
      }
      audit(state, "update", "customer", customer.id, user);
      await saveState(env, state);
      return json({ message: "Đã cập nhật khách hàng.", data: customer });
    }

    if (method === "GET" && pathname === "/api/admin/employees") {
      const search = normalizeText(url.searchParams.get("search"));
      const department = String(url.searchParams.get("department") || "");
      let employees = [...state.employees];
      if (search) employees = employees.filter((item: any) => normalizeText(`${item.name} ${item.employeeCode} ${item.email} ${item.phone}`).includes(search));
      if (department) employees = employees.filter((item: any) => item.department === department);
      return json({ data: employees });
    }

    if (method === "POST" && pathname === "/api/admin/employees") {
      if (!isAdmin(user)) return accessFailure(user);
      const body = await readBody(request);
      const email = normalizeText(body.email);
      if (!emailPattern.test(email) || state.employees.some((item: any) => normalizeText(item.email) === email)) {
        return fail(409, "Email nhân viên chưa hợp lệ hoặc đã tồn tại.");
      }
      const employee = {
        id: nextId("emp-"),
        employeeCode: `NV${String(state.employees.length + 1).padStart(3, "0")}`,
        name: String(body.name || "").trim(),
        email,
        phone: String(body.phone || "").trim(),
        roleTitle: String(body.roleTitle || "Nhân viên"),
        department: String(body.department || "Bán hàng"),
        status: body.status || "active",
        joinDate: body.joinDate || new Date().toISOString().slice(0, 10),
        shift: String(body.shift || "09:00 - 18:00"),
        performance: asMoney(body.performance || 80),
        address: String(body.address || ""),
        avatar: String(body.avatar || ""),
      };
      if (employee.name.length < 2 || !phonePattern.test(employee.phone)) return fail(400, "Họ tên hoặc số điện thoại chưa hợp lệ.");
      state.employees.push(employee);
      if (body.createAccount) {
        state.users.push({
          id: nextId("usr-"),
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          role: body.accountRole === "admin" ? "admin" : "staff",
          employeeId: employee.id,
          customerId: null,
          status: "active",
          passwordHash: await hashPassword(String(body.temporaryPassword || "Welcome@123")),
          createdAt: new Date().toISOString(),
        });
      }
      audit(state, "create", "employee", employee.id, user);
      await saveState(env, state);
      return json({ message: "Đã thêm nhân viên.", data: employee }, 201);
    }

    const employeeMatch = pathname.match(/^\/api\/admin\/employees\/([^/]+)$/);
    if (employeeMatch && method === "PUT") {
      if (!isAdmin(user)) return accessFailure(user);
      const employee = state.employees.find((item: any) => item.id === decodeURIComponent(employeeMatch[1]));
      if (!employee) return fail(404, "Nhân viên không tồn tại.");
      const body = await readBody(request);
      for (const field of ["name", "email", "phone", "roleTitle", "department", "status", "joinDate", "shift", "performance", "address", "avatar"]) {
        if (body[field] !== undefined) employee[field] = body[field];
      }
      employee.performance = Math.min(100, Math.max(0, asMoney(employee.performance)));
      audit(state, "update", "employee", employee.id, user);
      await saveState(env, state);
      return json({ message: "Đã cập nhật nhân viên.", data: employee });
    }

    if (employeeMatch && method === "DELETE") {
      if (!isAdmin(user)) return accessFailure(user);
      const employee = state.employees.find((item: any) => item.id === decodeURIComponent(employeeMatch[1]));
      if (!employee) return fail(404, "Nhân viên không tồn tại.");
      employee.status = "inactive";
      const account = state.users.find((item: any) => item.employeeId === employee.id);
      if (account) account.status = "inactive";
      audit(state, "deactivate", "employee", employee.id, user);
      await saveState(env, state);
      return json({ message: "Đã ngừng hoạt động tài khoản nhân viên.", data: employee });
    }

    if (method === "GET" && pathname === "/api/admin/users") {
      if (!isAdmin(user)) return accessFailure(user);
      return json({ data: state.users.map(sanitizeUser) });
    }

    const userMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (userMatch && method === "PATCH") {
      if (!isAdmin(user)) return accessFailure(user);
      const account = state.users.find((item: any) => item.id === decodeURIComponent(userMatch[1]));
      if (!account) return fail(404, "Tài khoản không tồn tại.");
      const body = await readBody(request);
      if (["active", "inactive"].includes(body.status)) account.status = body.status;
      if (["admin", "staff", "customer"].includes(body.role)) account.role = body.role;
      audit(state, "update", "user", account.id, user);
      await saveState(env, state);
      return json({ message: "Đã cập nhật tài khoản.", data: sanitizeUser(account) });
    }

    if (method === "GET" && pathname === "/api/admin/inventory") {
      const search = normalizeText(url.searchParams.get("search"));
      const level = String(url.searchParams.get("level") || "all");
      let products = state.products.filter((item: any) => item.status !== "archived");
      if (search) products = products.filter((item: any) => normalizeText(`${item.name} ${item.sku}`).includes(search));
      if (level === "low") products = products.filter((item: any) => item.stock > 0 && item.stock <= 20);
      if (level === "out") products = products.filter((item: any) => item.stock === 0);
      if (level === "healthy") products = products.filter((item: any) => item.stock > 20);
      return json({
        data: products.map((item: any) => ({
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
    }

    if (method === "POST" && pathname === "/api/admin/inventory/adjust") {
      const body = await readBody(request);
      const product = state.products.find((item: any) => item.id === body.productId);
      if (!product) return fail(404, "Sản phẩm không tồn tại.");
      const quantity = Number.parseInt(body.quantity, 10);
      if (!Number.isFinite(quantity) || quantity === 0 || product.stock + quantity < 0) {
        return fail(400, "Số lượng điều chỉnh không hợp lệ.");
      }
      const before = product.stock;
      product.stock += quantity;
      audit(state, `${quantity > 0 ? "increase" : "decrease"}_stock:${before}->${product.stock}`, "product", product.id, user);
      await saveState(env, state);
      return json({ message: "Đã điều chỉnh tồn kho.", data: product });
    }

    if (method === "GET" && pathname === "/api/admin/purchase-orders") {
      return json({
        data: state.purchaseOrders.map((order: any) => ({
          ...order,
          items: order.items.map((line: any) => ({
            ...line,
            product: state.products.find((item: any) => item.id === line.productId) || null,
          })),
        })),
      });
    }

    if (method === "POST" && pathname === "/api/admin/purchase-orders") {
      const body = await readBody(request);
      const supplier = String(body.supplier || "").trim();
      if (!supplier || !Array.isArray(body.items) || !body.items.length) {
        return fail(400, "Nhà cung cấp và danh sách nhập hàng là bắt buộc.");
      }
      const items = [];
      for (const line of body.items) {
        const product = state.products.find((item: any) => item.id === line.productId);
        if (!product) return fail(400, "Sản phẩm nhập kho không tồn tại.");
        items.push({
          productId: product.id,
          quantity: asPositiveInt(line.quantity),
          unitCost: asMoney(line.unitCost || product.cost),
        });
      }
      const purchaseOrder = {
        id: `PO-${new Date().getFullYear()}-${String(state.purchaseOrders.length + 1).padStart(3, "0")}`,
        supplier,
        expectedDate: body.expectedDate || null,
        status: "ordered",
        total: items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
        items,
        createdAt: new Date().toISOString(),
      };
      state.purchaseOrders.unshift(purchaseOrder);
      audit(state, "create", "purchase_order", purchaseOrder.id, user);
      await saveState(env, state);
      return json({ message: "Đã tạo phiếu nhập hàng.", data: purchaseOrder }, 201);
    }

    const receiveMatch = pathname.match(/^\/api\/admin\/purchase-orders\/([^/]+)\/receive$/);
    if (receiveMatch && method === "PATCH") {
      const purchaseOrder = state.purchaseOrders.find((item: any) => item.id === decodeURIComponent(receiveMatch[1]));
      if (!purchaseOrder) return fail(404, "Phiếu nhập không tồn tại.");
      if (purchaseOrder.status === "received") return fail(409, "Phiếu này đã được nhập kho.");
      for (const line of purchaseOrder.items) {
        const product = state.products.find((item: any) => item.id === line.productId);
        if (product) {
          product.stock += line.quantity;
          product.cost = line.unitCost;
        }
      }
      purchaseOrder.status = "received";
      purchaseOrder.receivedAt = new Date().toISOString();
      purchaseOrder.receivedBy = user.id;
      audit(state, "receive", "purchase_order", purchaseOrder.id, user);
      await saveState(env, state);
      return json({ message: "Đã nhập hàng vào kho.", data: purchaseOrder });
    }

    if (method === "GET" && pathname === "/api/admin/contacts") {
      return json({
        data: [...state.contacts].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      });
    }

    const contactMatch = pathname.match(/^\/api\/admin\/contacts\/([^/]+)$/);
    if (contactMatch && method === "PATCH") {
      const contact = state.contacts.find((item: any) => item.id === decodeURIComponent(contactMatch[1]));
      if (!contact) return fail(404, "Yêu cầu hỗ trợ không tồn tại.");
      const body = await readBody(request);
      if (["new", "in_progress", "resolved"].includes(body.status)) contact.status = body.status;
      contact.assigneeId = user.id;
      contact.updatedAt = new Date().toISOString();
      await saveState(env, state);
      return json({ message: "Đã cập nhật yêu cầu hỗ trợ.", data: contact });
    }

    if (method === "GET" && pathname === "/api/admin/audit-logs") {
      if (!isAdmin(user)) return accessFailure(user);
      return json({ data: state.auditLogs.slice(0, 100) });
    }

    return null;
  }

  if (pathname.startsWith("/api/staff/")) {
    if (!allowed(user, ["admin", "staff"])) return accessFailure(user);

    if (method === "GET" && pathname === "/api/staff/workspace") {
      const employee = state.employees.find((item: any) => item.id === user.employeeId);
      if (!employee) return fail(404, "Hồ sơ nhân viên không tồn tại.");
      const today = new Date().toISOString().slice(0, 10);
      const attendance = state.attendance.find((item: any) => item.employeeId === employee.id && item.date === today) || null;
      const tasks = state.tasks
        .filter((item: any) => item.employeeId === employee.id)
        .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      const orderQueue = state.orders
        .filter((item: any) => item.assigneeId === employee.id || (!item.assigneeId && item.status === "pending"))
        .filter((item: any) => !["delivered", "cancelled"].includes(item.status))
        .slice(0, 8);
      return json({
        data: {
          employee,
          attendance,
          tasks,
          orderQueue,
          summary: {
            openTasks: tasks.filter((item: any) => item.status !== "done").length,
            completedTasks: tasks.filter((item: any) => item.status === "done").length,
            assignedOrders: orderQueue.length,
            shift: employee.shift,
          },
        },
      });
    }

    if (method === "POST" && pathname === "/api/staff/attendance") {
      const employee = state.employees.find((item: any) => item.id === user.employeeId);
      if (!employee) return fail(404, "Hồ sơ nhân viên không tồn tại.");
      const body = await readBody(request);
      const today = new Date().toISOString().slice(0, 10);
      const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
      let attendance = state.attendance.find((item: any) => item.employeeId === employee.id && item.date === today);
      if (body.action === "check_in") {
        if (attendance?.checkIn) return fail(409, "Bạn đã chấm công vào ca hôm nay.");
        attendance = attendance || { id: nextId("att-"), employeeId: employee.id, date: today };
        attendance.checkIn = time;
        attendance.checkOut = null;
        attendance.status = "present";
        if (!state.attendance.includes(attendance)) state.attendance.push(attendance);
      } else if (body.action === "check_out") {
        if (!attendance?.checkIn) return fail(409, "Bạn chưa chấm công vào ca.");
        if (attendance.checkOut) return fail(409, "Bạn đã kết thúc ca hôm nay.");
        attendance.checkOut = time;
      } else {
        return fail(400, "Thao tác chấm công không hợp lệ.");
      }
      audit(state, body.action, "attendance", attendance.id, user);
      await saveState(env, state);
      return json({ message: body.action === "check_in" ? "Đã ghi nhận vào ca." : "Đã ghi nhận kết thúc ca.", data: attendance });
    }

    const taskMatch = pathname.match(/^\/api\/staff\/tasks\/([^/]+)$/);
    if (taskMatch && method === "PATCH") {
      const task = state.tasks.find((item: any) => item.id === decodeURIComponent(taskMatch[1]));
      if (!task) return fail(404, "Công việc không tồn tại.");
      if (user.role !== "admin" && task.employeeId !== user.employeeId) {
        return fail(403, "Bạn không thể cập nhật công việc này.");
      }
      const body = await readBody(request);
      if (["todo", "in_progress", "done"].includes(body.status)) task.status = body.status;
      if (body.title && user.role === "admin") task.title = String(body.title).trim();
      task.updatedAt = new Date().toISOString();
      audit(state, "update", "task", task.id, user);
      await saveState(env, state);
      return json({ message: "Đã cập nhật công việc.", data: task });
    }

    return null;
  }

  return null;
}

