import { createRequire } from "node:module";
import { access, cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const deploymentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(deploymentRoot, "..");
const publicDir = path.join(deploymentRoot, "public");
const clientBuild = path.join(workspaceRoot, "client", "build");
const adminBuild = path.join(workspaceRoot, "admin", "build");

async function assertExists(filePath) {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Thiếu tệp đã build: ${filePath}`);
  }
}

await Promise.all([
  assertExists(path.join(clientBuild, "index.html")),
  assertExists(path.join(adminBuild, "index.html")),
]);

await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });

const storefrontFiles = [
  "asset-manifest.json",
  "brand-icon.svg",
  "favicon.ico",
  "index.html",
  "manifest.json",
  "og.png",
  "og-novawear.png",
  "robots.txt",
];

for (const filename of storefrontFiles) {
  const source = path.join(clientBuild, filename);
  try {
    await access(source);
    await cp(source, path.join(publicDir, filename));
  } catch {
    // Optional CRA artifacts can be absent without blocking the deployment.
  }
}
await cp(path.join(clientBuild, "static"), path.join(publicDir, "static"), { recursive: true });

const imageDir = path.join(publicDir, "Images");
await mkdir(imageDir, { recursive: true });
await cp(
  path.join(workspaceRoot, "client", "public", "Images", "nova-v3"),
  path.join(imageDir, "nova-v3"),
  { recursive: true },
);

const opsDir = path.join(publicDir, "ops");
await mkdir(opsDir, { recursive: true });
for (const filename of ["asset-manifest.json", "brand-icon.svg", "favicon.ico", "index.html", "manifest.json", "robots.txt"]) {
  const source = path.join(adminBuild, filename);
  try {
    await access(source);
    await cp(source, path.join(opsDir, filename));
  } catch {
    // Optional CRA artifacts can be absent without blocking the deployment.
  }
}
await cp(path.join(adminBuild, "static"), path.join(opsDir, "static"), { recursive: true });
await cp(
  path.join(workspaceRoot, "admin", "public", "images", "nova-v3"),
  path.join(opsDir, "images", "nova-v3"),
  { recursive: true },
);

const require = createRequire(import.meta.url);
const { createSeedData } = require("../../BackEnd/server/data/seed.js");
const seed = createSeedData();
seed.users = seed.users.map(({ passwordHash: _passwordHash, ...user }) => ({
  ...user,
  passwordHash: "",
}));
seed.meta = { ...seed.meta, deployment: "sites" };

await writeFile(
  path.join(deploymentRoot, "worker", "seed-data.json"),
  `${JSON.stringify(seed, null, 2)}\n`,
  "utf8",
);

console.log("Đã chuẩn bị bộ ảnh NOVAWEAR v3 và hai giao diện.");
