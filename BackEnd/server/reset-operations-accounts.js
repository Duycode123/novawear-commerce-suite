require("dotenv").config();

const { createStoreFromEnv } = require("./lib/store");
const { hashPassword } = require("./lib/security");

const APPLY_FLAG = "--apply";
const ADMIN_EMAIL = "admin@novawear.vn";
const ADMIN_PASSWORD = "Admin@123";
const STAFF_EMAIL = "staff@novawear.vn";
const STAFF_PASSWORD = "Staff@123";

function activeOperationsUsers(users = []) {
  return users.filter((user) => ["admin", "staff"].includes(user.role));
}

async function main() {
  const apply = process.argv.includes(APPLY_FLAG);
  const store = await createStoreFromEnv();

  try {
    if (store.data?.meta?.brand !== "NOVAWEAR") {
      throw new Error("Từ chối thao tác: cơ sở dữ liệu hiện tại không phải NOVAWEAR.");
    }

    const operationUsers = activeOperationsUsers(store.data.users);
    const employeeCount = Array.isArray(store.data.employees) ? store.data.employees.length : 0;
    const customerAccountCount = (store.data.users || []).filter((user) => user.role === "customer").length;

    console.log(JSON.stringify({
      mode: apply ? "apply" : "preview",
      database: {
        type: String(process.env.DB_TYPE || "json").toLowerCase(),
        host: process.env.DB_HOST || "local-json",
        name: process.env.DB_NAME || process.env.DATA_FILE || "store.json",
      },
      before: {
        operationsAccounts: operationUsers.length,
        adminAccounts: operationUsers.filter((user) => user.role === "admin").length,
        staffAccounts: operationUsers.filter((user) => user.role === "staff").length,
        employeeProfiles: employeeCount,
        preservedCustomerAccounts: customerAccountCount,
      },
    }, null, 2));

    if (!apply) {
      console.log(`Chạy lại với ${APPLY_FLAG} để xác nhận đặt lại tài khoản vận hành.`);
      return;
    }

    if (String(process.env.NODE_ENV || "development").toLowerCase() === "production") {
      throw new Error("Từ chối đặt lại tài khoản vận hành trên môi trường production.");
    }

    const now = new Date().toISOString();
    const resetId = Date.now();
    const adminEmployeeId = `emp-admin-${resetId}-a`;
    const staffEmployeeId = `emp-staff-${resetId}-s`;
    const adminUserId = `usr-admin-${resetId}-a`;
    const staffUserId = `usr-staff-${resetId}-s`;

    const adminEmployee = {
      id: adminEmployeeId,
      employeeCode: "NV001",
      name: "Quản trị NOVAWEAR",
      email: ADMIN_EMAIL,
      phone: "0908000001",
      roleTitle: "Quản trị hệ thống",
      department: "Vận hành",
      status: "active",
      joinDate: now.slice(0, 10),
      shift: "Linh hoạt",
      performance: 100,
      address: "",
      avatar: "",
    };
    const staffEmployee = {
      id: staffEmployeeId,
      employeeCode: "NV002",
      name: "Nhân viên NOVAWEAR",
      email: STAFF_EMAIL,
      phone: "0908000002",
      roleTitle: "Nhân viên vận hành",
      department: "Vận hành",
      status: "active",
      joinDate: now.slice(0, 10),
      shift: "09:00 - 18:00",
      performance: 100,
      address: "",
      avatar: "",
    };
    const adminUser = {
      id: adminUserId,
      name: adminEmployee.name,
      email: ADMIN_EMAIL,
      phone: adminEmployee.phone,
      role: "admin",
      employeeId: adminEmployeeId,
      customerId: null,
      status: "active",
      emailVerifiedAt: now,
      tokenVersion: 0,
      passwordHash: hashPassword(ADMIN_PASSWORD),
      createdAt: now,
    };
    const staffUser = {
      id: staffUserId,
      name: staffEmployee.name,
      email: STAFF_EMAIL,
      phone: staffEmployee.phone,
      role: "staff",
      employeeId: staffEmployeeId,
      customerId: null,
      status: "active",
      emailVerifiedAt: now,
      tokenVersion: 0,
      passwordHash: hashPassword(STAFF_PASSWORD),
      createdAt: now,
    };

    store.data.users = [
      ...(store.data.users || []).filter((user) => !["admin", "staff"].includes(user.role)),
      adminUser,
      staffUser,
    ];
    store.data.employees = [adminEmployee, staffEmployee];

    (store.data.orders || []).forEach((order) => { order.assigneeId = null; });
    (store.data.returns || []).forEach((request) => { request.assigneeId = null; });
    (store.data.contacts || []).forEach((contact) => { contact.assigneeId = null; });
    (store.data.tasks || []).forEach((task) => { task.employeeId = staffEmployeeId; });
    store.data.attendance = [];
    (store.data.notifications || []).forEach((notification) => {
      if (notification.audience === "operations") notification.readBy = [];
    });

    store.audit("operations_accounts_reset", "user", "operations", {
      name: "Thiết lập tài khoản kiểm thử",
    });
    await store.save();

    console.log(JSON.stringify({
      after: {
        operationsAccounts: activeOperationsUsers(store.data.users).length,
        adminAccounts: activeOperationsUsers(store.data.users).filter((user) => user.role === "admin").length,
        staffAccounts: activeOperationsUsers(store.data.users).filter((user) => user.role === "staff").length,
        employeeProfiles: store.data.employees.length,
        preservedCustomerAccounts: store.data.users.filter((user) => user.role === "customer").length,
        oldSessionsInvalidated: true,
      },
    }, null, 2));
  } finally {
    if (typeof store.close === "function") await store.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
