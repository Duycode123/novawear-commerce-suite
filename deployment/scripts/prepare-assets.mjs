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

const activeImages = [
  "11-0_672x990.jpg",
  "11-181_672x990.jpg",
  "22-0_672x990.jpg",
  "2_91_672x990.jpg",
  "aBT5A8965_672x990.jpg",
  "BT5A9235f_46_672x990.jpg",
  "DSC08342_672x990.jpg",
  "dgrey2_1_copy_672x990.jpg",
  "jeanv2garment_16_672x990.jpg",
  "jeansv2dam_25_672x990.jpg",
  "denn3-(2)_copy.jpg",
  "navy56_74-2_copy.jpg",
  "navyshort_672x990.jpg",
  "navy-short 2.jpg",
  "ecol5_672x990.jpg",
  "eocl6_672x990.jpg",
  "about-us-model.webp",
  "homepage-irl1.png",
  "homepage-irl2.png",
  "homepage-irl3.png",
  "homepage-irl4.png",
  "homepage-irl5.png",
];

const imageDir = path.join(publicDir, "Images");
await mkdir(imageDir, { recursive: true });
for (const filename of activeImages) {
  await cp(
    path.join(workspaceRoot, "client", "public", "Images", filename),
    path.join(imageDir, filename),
  );
}

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

console.log(`Đã chuẩn bị ${activeImages.length} ảnh đang sử dụng và hai giao diện.`);

