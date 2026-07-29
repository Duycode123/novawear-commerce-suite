require("dotenv").config();
const { createApp } = require("./app");
const { createStoreFromEnv } = require("./lib/store");

const port = Number(process.env.PORT || 5000);
let server;
let store;

async function start() {
  store = await createStoreFromEnv();
  const app = createApp({ store });
  server = app.listen(port, () => {
    console.log(`NOVAWEAR API running at http://localhost:${port} using ${String(process.env.DB_TYPE || "json").toUpperCase()}.`);
  });
}

async function shutdown(signal) {
  console.log(`\nReceived ${signal}; stopping server...`);
  if (!server) process.exit(0);
  server.close(async () => {
    if (store?.close) await store.close();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((error) => {
  console.error("Database connection failed:", error.message);
  process.exit(1);
});
