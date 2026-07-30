const test = require("node:test");
const assert = require("node:assert/strict");
const { createSeedData } = require("../data/seed");
const {
  CATALOG_CATEGORIES,
  MIN_PRODUCTS_PER_CATEGORY,
  applyCatalogMigration,
} = require("../lib/catalog-migration");

test("catalog migration persists ten editable products per men and women category", () => {
  const data = createSeedData();
  const originalOrderProductIds = data.orders.flatMap((order) => order.items.map((item) => item.productId));
  const result = applyCatalogMigration(data);

  assert.equal(result.changed, true);
  assert.equal(data.categories.filter((item) => item.status === "active").length, CATALOG_CATEGORIES.length);
  for (const category of CATALOG_CATEGORIES) {
    const products = data.products.filter((product) => product.categoryId === category.id && product.status === "active");
    assert.equal(products.length, MIN_PRODUCTS_PER_CATEGORY, category.name);
    assert.ok(products.every((product) => product.audience === category.audience));
    assert.ok(products.every((product) => product.description && product.longDescription));
    assert.ok(products.every((product) => product.materials && product.care && product.fit));
    assert.ok(products.every((product) => product.images.length >= 2));
    assert.ok(products.every((product) => product.variants.length > 0));
  }
  assert.ok(originalOrderProductIds.every((productId) => data.products.some((product) => product.id === productId)));
});

test("catalog migration is idempotent and never fabricates ratings or sales", () => {
  const data = createSeedData();
  applyCatalogMigration(data);
  const count = data.products.length;
  const generated = data.products.filter((product) => Number(product.id.slice(4)) > 14);

  assert.ok(generated.length > 0);
  assert.ok(generated.every((product) => product.rating === 0 && product.reviewCount === 0 && product.sold === 0));
  assert.deepEqual(applyCatalogMigration(data), {
    changed: false,
    addedProducts: 0,
    categories: CATALOG_CATEGORIES.length,
  });
  assert.equal(data.products.length, count);
});
