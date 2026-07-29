const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { createSeedData } = require("../data/seed");

class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = null;
    this.load();
  }

  load() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      this.data = createSeedData();
      this.save();
      return;
    }

    try {
      this.data = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    } catch (error) {
      throw new Error(`Không thể đọc kho dữ liệu tại ${this.filePath}: ${error.message}`);
    }
  }

  save() {
    this.data.meta = {
      ...(this.data.meta || {}),
      updatedAt: new Date().toISOString(),
    };
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), "utf8");
    fs.renameSync(tempPath, this.filePath);
  }

  reset() {
    this.data = createSeedData();
    this.save();
    return this.data;
  }

  nextId(collectionName, prefix) {
    const collection = this.data[collectionName] || [];
    const max = collection.reduce((current, item) => {
      const match = String(item.id || "").match(/(\d+)$/);
      return Math.max(current, match ? Number(match[1]) : 0);
    }, 0);
    return `${prefix}${String(max + 1).padStart(3, "0")}`;
  }

  audit(action, entity, entityId, actor) {
    this.data.auditLogs = this.data.auditLogs || [];
    this.data.auditLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      entity,
      entityId,
      actorId: actor?.id || null,
      actorName: actor?.name || "Hệ thống",
      at: new Date().toISOString(),
    });
    this.data.auditLogs = this.data.auditLogs.slice(0, 500);
  }
}

class PostgresStore {
  constructor(pool, data) {
    this.pool = pool;
    this.data = data;
    this.writeQueue = Promise.resolve();
  }

  save() {
    this.data.meta = { ...(this.data.meta || {}), updatedAt: new Date().toISOString() };
    const snapshot = JSON.stringify(this.data);
    this.writeQueue = this.writeQueue.catch(() => {}).then(() => this.pool.query(
      `INSERT INTO novawear_app_state (id, data, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [snapshot],
    ));
    return this.writeQueue;
  }

  reset() {
    this.data = createSeedData();
    this.save();
    return this.data;
  }

  nextId(collectionName, prefix) {
    const collection = this.data[collectionName] || [];
    const max = collection.reduce((current, item) => {
      const match = String(item.id || "").match(/(\d+)$/);
      return Math.max(current, match ? Number(match[1]) : 0);
    }, 0);
    return `${prefix}${String(max + 1).padStart(3, "0")}`;
  }

  audit(action, entity, entityId, actor) {
    this.data.auditLogs = this.data.auditLogs || [];
    this.data.auditLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action, entity, entityId,
      actorId: actor?.id || null,
      actorName: actor?.name || "Hệ thống",
      at: new Date().toISOString(),
    });
    this.data.auditLogs = this.data.auditLogs.slice(0, 500);
  }

  async close() {
    await this.writeQueue;
    await this.pool.end();
  }
}

async function createStoreFromEnv() {
  if (String(process.env.DB_TYPE || "json").toLowerCase() !== "postgres") {
    return new JsonStore(process.env.DATA_FILE || path.join(__dirname, "..", "data", "store.json"));
  }
  const pool = new Pool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "postgres",
    max: Number(process.env.DB_POOL_SIZE || 10),
    ssl: String(process.env.DB_SSL || "false").toLowerCase() === "true" ? { rejectUnauthorized: false } : false,
  });
  await pool.query(`CREATE TABLE IF NOT EXISTS novawear_app_state (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const result = await pool.query("SELECT data FROM novawear_app_state WHERE id = 1");
  const store = new PostgresStore(pool, result.rows[0]?.data || createSeedData());
  if (!result.rows[0]) await store.save();
  return store;
}

module.exports = { JsonStore, PostgresStore, createStoreFromEnv };
