const { writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const workspaceRoot = resolve(__dirname, "..");
const siteUrl = String(process.env.REACT_APP_SITE_URL || "https://novawear-duycode123.vercel.app").replace(/\/$/, "");
const apiUrl = String(process.env.REACT_APP_API_URL || "https://novawear-api-duycode123.onrender.com/api").replace(/\/$/, "");
const today = new Date().toISOString().slice(0, 10);

const staticRoutes = [
  ["/", "daily", "1.0"],
  ["/cua-hang", "daily", "0.9"],
  ["/cua-hang?audience=men", "daily", "0.8"],
  ["/cua-hang?audience=women", "daily", "0.8"],
  ["/uu-dai", "daily", "0.8"],
  ["/chon-size", "monthly", "0.7"],
  ["/tin-tuc", "weekly", "0.7"],
  ["/ve-chung-toi", "monthly", "0.6"],
  ["/phong-cach/thuong-ngay", "weekly", "0.7"],
  ["/phong-cach/van-dong", "weekly", "0.7"],
  ["/phong-cach/cuoi-tuan", "weekly", "0.7"],
  ["/ho-tro", "monthly", "0.5"],
  ["/doi-tra", "monthly", "0.5"],
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function entry(path, lastmod = today, changefreq = "weekly", priority = "0.6") {
  return `  <url><loc>${escapeXml(`${siteUrl}${path}`)}</loc><lastmod>${escapeXml(lastmod)}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

async function readJson(path) {
  const response = await fetch(`${apiUrl}${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

async function readAllProducts() {
  const firstPage = await readJson("/products?limit=100&page=1&view=card");
  const products = [...(firstPage.data || [])];
  const totalPages = Math.max(1, Number(firstPage.pagination?.totalPages || 1));
  for (let page = 2; page <= totalPages; page += 1) {
    const result = await readJson(`/products?limit=100&page=${page}&view=card`);
    products.push(...(result.data || []));
  }
  return products;
}

async function main() {
  const urls = staticRoutes.map(([path, frequency, priority]) => entry(path, today, frequency, priority));
  try {
    const [products, news] = await Promise.all([
      readAllProducts(),
      readJson("/news"),
    ]);
    for (const product of products) {
      urls.push(entry(
        `/san-pham/${encodeURIComponent(product.slug || product.id)}`,
        String(product.updatedAt || product.createdAt || today).slice(0, 10),
        "weekly",
        "0.7",
      ));
    }
    for (const article of news.data || []) {
      urls.push(entry(
        `/tin-tuc/${encodeURIComponent(article.id)}`,
        String(article.publishedAt || today).slice(0, 10),
        "monthly",
        "0.6",
      ));
    }
  } catch (error) {
    console.warn(`Không tải được URL động cho sitemap; giữ các trang tĩnh: ${error.message}`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  writeFileSync(join(workspaceRoot, "client", "build", "sitemap.xml"), xml, "utf8");
  console.log(`Đã tạo sitemap với ${urls.length} URL.`);
}

main().catch((error) => {
  console.warn(`Không thể tạo sitemap động: ${error.message}`);
});
