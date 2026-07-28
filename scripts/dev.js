const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const services = [
  {
    name: "API",
    cwd: path.join(root, "BackEnd", "server"),
    args: ["start"],
    env: {},
  },
  {
    name: "Cửa hàng",
    cwd: path.join(root, "client"),
    args: ["start"],
    env: { BROWSER: "none", PORT: "3000" },
  },
  {
    name: "NOVA OPS",
    cwd: path.join(root, "admin"),
    args: ["start"],
    env: { BROWSER: "none", PORT: "3001" },
  },
];

const children = services.map((service) => {
  const child = spawn(npm, service.args, {
    cwd: service.cwd,
    env: { ...process.env, ...service.env },
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`[${service.name}] Không thể khởi động: ${error.message}`);
  });

  child.on("exit", (code, signal) => {
    if (code && !signal) {
      console.error(`[${service.name}] Đã dừng với mã lỗi ${code}.`);
    }
  });

  return child;
});

console.log("\nNOVAWEAR đang khởi động:");
console.log("• Cửa hàng: http://localhost:3000");
console.log("• Nhân viên / quản trị: http://localhost:3001");
console.log("• API: http://localhost:5000/api/health");
console.log("\nNhấn Ctrl+C để dừng toàn bộ.\n");

let stopping = false;
function stopAll() {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => {
    if (!child.killed) child.kill();
  });
  setTimeout(() => process.exit(0), 500).unref();
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

