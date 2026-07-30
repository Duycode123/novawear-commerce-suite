const { hashPassword } = require("./security");

const DEMO_ACCOUNT_EMAILS = new Set([
  "admin@novawear.vn",
  "staff@novawear.vn",
  "demo@novawear.vn",
]);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function enabled(value) {
  return String(value || "false").toLowerCase() === "true";
}

function strongBootstrapPassword(value) {
  const password = String(value || "");
  return password.length >= 14
    && password.length <= 128
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

function enforceProductionIdentityPolicy(store, options = {}) {
  const production = options.production ?? process.env.NODE_ENV === "production";
  const allowDemoAccounts = options.allowDemoAccounts
    ?? enabled(process.env.ALLOW_DEMO_ACCOUNTS);

  if (!production || allowDemoAccounts) {
    return { changed: false, demoAccountsDisabled: false, bootstrapAdminReady: false };
  }

  const email = normalizeEmail(options.bootstrapEmail || process.env.BOOTSTRAP_ADMIN_EMAIL);
  const password = String(options.bootstrapPassword || process.env.BOOTSTRAP_ADMIN_PASSWORD || "");
  const name = String(options.bootstrapName || process.env.BOOTSTRAP_ADMIN_NAME || "Quản trị NOVAWEAR").trim();
  const phone = String(options.bootstrapPhone || process.env.BOOTSTRAP_ADMIN_PHONE || "").trim();
  const passwordVersion = String(
    options.bootstrapPasswordVersion || process.env.BOOTSTRAP_ADMIN_PASSWORD_VERSION || "1",
  ).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL chưa đúng định dạng.");
  }
  if (!strongBootstrapPassword(password)) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD cần 14-128 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
  }

  const now = new Date().toISOString();
  let changed = false;
  const users = Array.isArray(store.data.users) ? store.data.users : (store.data.users = []);
  const employees = Array.isArray(store.data.employees) ? store.data.employees : (store.data.employees = []);

  users.forEach((user) => {
    const userEmail = normalizeEmail(user.email);
    if (!DEMO_ACCOUNT_EMAILS.has(userEmail) || userEmail === email) return;
    if (user.status !== "inactive" || !user.demoAccountDisabledAt) {
      user.status = "inactive";
      user.demoAccountDisabledAt = now;
      user.tokenVersion = Number(user.tokenVersion || 0) + 1;
      const employee = employees.find((item) => item.id === user.employeeId);
      if (employee) employee.status = "inactive";
      const customer = (store.data.customers || []).find((item) => item.id === user.customerId);
      if (customer) customer.status = "inactive";
      store.audit?.("security_disable", "user", user.id, { name: "Hệ thống production" });
      changed = true;
    }
  });

  let employee = employees.find((item) => normalizeEmail(item.email) === email);
  if (!employee) {
    employee = {
      id: store.nextId("employees", "emp-"),
      employeeCode: `NV${String(employees.length + 1).padStart(3, "0")}`,
      name,
      email,
      phone,
      roleTitle: "Quản trị hệ thống",
      department: "Vận hành",
      status: "active",
      joinDate: now.slice(0, 10),
      shift: "Linh hoạt",
      performance: 100,
      address: "",
      avatar: "",
    };
    employees.push(employee);
    changed = true;
  } else if (employee.status !== "active") {
    employee.status = "active";
    changed = true;
  }

  let admin = users.find((item) => normalizeEmail(item.email) === email);
  if (!admin) {
    admin = {
      id: store.nextId("users", "usr-"),
      name,
      email,
      phone,
      role: "admin",
      employeeId: employee.id,
      customerId: null,
      status: "active",
      emailVerifiedAt: now,
      tokenVersion: 0,
      passwordHash: hashPassword(password),
      bootstrapManaged: true,
      bootstrapPasswordVersion: passwordVersion,
      createdAt: now,
    };
    users.push(admin);
    changed = true;
  } else {
    if (admin.role !== "admin" || admin.status !== "active" || !admin.emailVerifiedAt) {
      admin.role = "admin";
      admin.status = "active";
      admin.emailVerifiedAt = admin.emailVerifiedAt || now;
      admin.employeeId = employee.id;
      admin.customerId = null;
      admin.tokenVersion = Number(admin.tokenVersion || 0) + 1;
      changed = true;
    }
    if (String(admin.bootstrapPasswordVersion || "") !== passwordVersion) {
      admin.passwordHash = hashPassword(password);
      admin.bootstrapManaged = true;
      admin.bootstrapPasswordVersion = passwordVersion;
      admin.tokenVersion = Number(admin.tokenVersion || 0) + 1;
      changed = true;
    }
  }

  if (changed) {
    store.audit?.("bootstrap", "user", admin.id, { name: "Hệ thống production" });
    store.save();
  }

  return { changed, demoAccountsDisabled: true, bootstrapAdminReady: true, email };
}

module.exports = {
  DEMO_ACCOUNT_EMAILS,
  enforceProductionIdentityPolicy,
  strongBootstrapPassword,
};
