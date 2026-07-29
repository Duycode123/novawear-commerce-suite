const path = require("path");
require(path.join(__dirname, "..", "BackEnd", "server", "node_modules", "dotenv")).config({
  path: path.join(__dirname, "..", "BackEnd", "server", ".env"),
});
const { createStoreFromEnv } = require("../BackEnd/server/lib/store");
const { buildPayload } = require("./enrich-product-details");

async function main() {
  const store = await createStoreFromEnv();
  try {
    const categoryById = new Map(store.data.categories.map((category) => [category.id, category]));
    let updated = 0;
    store.data.products = store.data.products.map((product) => {
      const category = categoryById.get(product.categoryId);
      if (!category) return product;
      updated += 1;
      return buildPayload(product, category);
    });
    store.audit("enrich_catalog_details", "product", "all", {
      id: "system",
      name: "NOVAWEAR catalog migration",
    });
    await store.save();
    process.stdout.write(`Đã lưu trực tiếp ${updated} sản phẩm thuộc ${categoryById.size} danh mục.\n`);
  } finally {
    if (store.close) await store.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
