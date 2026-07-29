import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("deployment contains both branded interfaces", async () => {
  const [storefront, operations] = await Promise.all([
    readFile(new URL("../dist/client/index.html", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/ops/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(storefront, /NOVAWEAR/);
  assert.match(storefront, /og-novawear\.png/);
  assert.match(operations, /NOVA OPS/);
  assert.doesNotMatch(storefront, /codex-preview|Your site is taking shape/);
});

test("deployment contains the Worker, D1 declaration and migration", async () => {
  const [worker, hosting, migration] = await Promise.all([
    readFile(new URL("../dist/server/index.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../dist/.openai/drizzle/0000_legal_korvac.sql", import.meta.url), "utf8"),
  ]);
  assert.match(worker, /NOVAWEAR worker error/);
  assert.match(worker, /\/api\/admin\/overview/);
  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.ok(JSON.parse(hosting).project_id);
  assert.match(migration, /CREATE TABLE `app_state`/);
  await access(new URL("../dist/client/og-novawear.png", import.meta.url));
  await access(new URL("../dist/client/Images/nova-v3/home-hero.png", import.meta.url));
  await access(new URL("../dist/client/Images/nova-v3/product-tee-black.png", import.meta.url));
  await access(new URL("../dist/client/ops/images/nova-v3/admin-login.png", import.meta.url));
  await access(root);
});
