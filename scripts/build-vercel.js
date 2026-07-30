const { cpSync, existsSync, mkdirSync, rmSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const workspaceRoot = resolve(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npmCli = process.env.npm_execpath;

function runBuild(directory, extraEnv = {}) {
  const command = npmCli ? process.execPath : npmCommand;
  const args = npmCli ? [npmCli, "run", "build"] : ["run", "build"];
  const result = spawnSync(command, args, {
    cwd: join(workspaceRoot, directory),
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
    shell: !npmCli && process.platform === "win32",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

runBuild("client");
runBuild("admin", {
  PUBLIC_URL: "/ops",
  REACT_APP_BASENAME: "/ops",
});

const storefrontBuild = join(workspaceRoot, "client", "build");
const adminBuild = join(workspaceRoot, "admin", "build");
const adminTarget = join(storefrontBuild, "ops");

if (!existsSync(join(storefrontBuild, "index.html")) || !existsSync(join(adminBuild, "index.html"))) {
  throw new Error("Không tìm thấy kết quả build của cửa hàng hoặc trang quản trị.");
}

rmSync(adminTarget, { recursive: true, force: true });
mkdirSync(adminTarget, { recursive: true });
cpSync(adminBuild, adminTarget, { recursive: true });

console.log("Đã đóng gói cửa hàng tại / và trang quản trị tại /ops.");
