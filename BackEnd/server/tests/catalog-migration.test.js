const test = require("node:test");
const assert = require("node:assert/strict");
const { createSeedData } = require("../data/seed");
const {
  CATALOG_CATEGORIES,
  PRODUCTS_PER_CATEGORY,
  applyCatalogMigration,
} = require("../lib/catalog-migration");

test("catalog migration persists four editable, accurately described products per category", () => {
  const data = createSeedData();
  const originalOrderProductIds = data.orders.flatMap((order) => order.items.map((item) => item.productId));
  const result = applyCatalogMigration(data);

  assert.equal(result.changed, true);
  assert.equal(data.categories.filter((item) => item.status === "active").length, CATALOG_CATEGORIES.length);
  for (const category of CATALOG_CATEGORIES) {
    const products = data.products.filter((product) => product.categoryId === category.id && product.status === "active");
    assert.equal(products.length, PRODUCTS_PER_CATEGORY, category.name);
    assert.ok(products.every((product) => product.audience === category.audience));
    assert.ok(products.every((product) => product.description && product.longDescription));
    assert.ok(products.every((product) => product.materials && product.care && product.fit));
    assert.ok(products.every((product) => product.images.length >= 2));
    assert.ok(products.every((product) => product.variants.length > 0));
    assert.equal(new Set(products.map((product) => product.name)).size, PRODUCTS_PER_CATEGORY);
    assert.equal(new Set(products.map((product) => product.description)).size, PRODUCTS_PER_CATEGORY);
  }
  assert.ok(originalOrderProductIds.every((productId) => data.products.some((product) => product.id === productId)));
});

test("catalog v2 data is safely reduced from ten to four active products per category", () => {
  const data = createSeedData();
  applyCatalogMigration(data, { target: 10 });
  data.meta.catalogVersion = 2;
  const before = data.products.length;
  const referencedBefore = new Set(data.orders.flatMap((order) => order.items.map((item) => item.productId)));

  const result = applyCatalogMigration(data);

  assert.equal(result.changed, true);
  assert.ok(result.removedProducts > 0);
  assert.ok(data.products.length < before);
  for (const category of CATALOG_CATEGORIES) {
    const active = data.products.filter((product) => product.categoryId === category.id && product.status === "active");
    assert.equal(active.length, PRODUCTS_PER_CATEGORY, category.name);
  }
  assert.ok([...referencedBefore].every((productId) => data.products.some((product) => product.id === productId)));
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

test("catalog v4 merges duplicate category slugs and repairs stale product category links", () => {
  const data = createSeedData();
  applyCatalogMigration(data);
  data.meta.catalogVersion = 3;

  const tee = data.categories.find((category) => category.slug === "ao-thun-nam");
  data.categories.push({ ...tee, id: "cat-legacy-tee" });
  const trousers = data.products.find((product) => product.slug === "quan-daily-tapered");
  trousers.categoryId = "cat-legacy-tee";
  trousers.longDescription = "T-shirt không đúng loại sản phẩm.";

  const result = applyCatalogMigration(data);

  assert.equal(result.changed, true);
  assert.equal(data.meta.catalogVersion, 4);
  assert.equal(data.categories.filter((category) => category.slug === "ao-thun-nam").length, 1);
  assert.equal(data.categories.find((category) => category.slug === "ao-thun-nam").id, "cat-tee");
  assert.equal(trousers.categoryId, "cat-khaki");
  assert.doesNotMatch(trousers.longDescription, /T-shirt không đúng loại/i);
  assert.match(trousers.modelInfo, /size 31/i);
});

test("recent Cloudinary images receive matching editable product copy exactly once", () => {
  const data = createSeedData();
  applyCatalogMigration(data);
  const product = {
    id: "prd-125",
    sku: "NVA-ACC-125",
    categoryId: "cat-accessories-men",
    price: 429000,
    stock: 12,
    image: "https://res.cloudinary.com/demo/image/upload/v1785649181/novawear/products/govpnhtkqac0pagfnhcq.webp",
    images: ["https://res.cloudinary.com/demo/image/upload/v1785649181/novawear/products/govpnhtkqac0pagfnhcq.webp"],
    name: "Webbing Belt",
    description: "Mô tả cũ không còn đúng với ảnh.",
  };
  data.products.push(product);
  const preserved = {
    sku: product.sku,
    categoryId: product.categoryId,
    price: product.price,
    stock: product.stock,
  };
  const result = applyCatalogMigration(data);

  assert.equal(result.changed, true);
  assert.equal(product.name, "Túi trống thể thao Compact");
  assert.match(product.description, /Túi trống xanh đậm/i);
  assert.match(product.longDescription, /quai xách bản rộng/i);
  assert.deepEqual({
    sku: product.sku,
    categoryId: product.categoryId,
    price: product.price,
    stock: product.stock,
  }, preserved);
  assert.equal(product.image, product.images[0]);
  assert.equal(data.meta.imageCopyVersion, 1);
  assert.deepEqual(applyCatalogMigration(data), {
    changed: false,
    addedProducts: 0,
    categories: CATALOG_CATEGORIES.length,
  });
});
