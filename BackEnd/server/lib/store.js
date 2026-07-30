const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { createSeedData } = require("../data/seed");
const { applyCatalogMigration } = require("./catalog-migration");

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
      applyCatalogMigration(this.data);
      this.save();
      return;
    }

    try {
      this.data = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      const migration = applyCatalogMigration(this.data);
      if (migration.changed) this.save();
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

const projectionSchemas = [
  `CREATE TABLE IF NOT EXISTS novawear_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    verified_at TIMESTAMPTZ,
    customer_id TEXT,
    employee_id TEXT,
    created_at TIMESTAMPTZ,
    data JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS novawear_products (
    id TEXT PRIMARY KEY,
    sku TEXT,
    name TEXT NOT NULL,
    slug TEXT,
    category_id TEXT,
    audience TEXT,
    price BIGINT NOT NULL DEFAULT 0,
    compare_price BIGINT NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    status TEXT,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    sale_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    data JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS novawear_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT,
    audience TEXT,
    status TEXT,
    product_count INTEGER NOT NULL DEFAULT 0,
    data JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS novawear_orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    status TEXT,
    payment_status TEXT,
    payment_method TEXT,
    total BIGINT NOT NULL DEFAULT 0,
    tracking_code TEXT,
    created_at TIMESTAMPTZ,
    data JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS novawear_customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    tier TEXT,
    total_spent BIGINT NOT NULL DEFAULT 0,
    order_count INTEGER NOT NULL DEFAULT 0,
    status TEXT,
    created_at TIMESTAMPTZ,
    data JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS novawear_employees (
    id TEXT PRIMARY KEY,
    employee_code TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role_title TEXT,
    department TEXT,
    status TEXT,
    join_date DATE,
    shift TEXT,
    performance NUMERIC(5,2),
    data JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS novawear_reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    customer_id TEXT,
    order_id TEXT,
    rating INTEGER,
    status TEXT,
    created_at TIMESTAMPTZ,
    data JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS novawear_coupons (
    id TEXT PRIMARY KEY,
    code TEXT,
    type TEXT,
    value BIGINT NOT NULL DEFAULT 0,
    min_order BIGINT NOT NULL DEFAULT 0,
    usage_limit INTEGER NOT NULL DEFAULT 0,
    used_count INTEGER NOT NULL DEFAULT 0,
    status TEXT,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    data JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS novawear_news (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    status TEXT,
    published_at TIMESTAMPTZ,
    data JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS novawear_returns (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    customer_id TEXT,
    type TEXT,
    reason TEXT,
    status TEXT,
    refund_amount BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ,
    data JSONB NOT NULL
  )`,
];

const projectionQueries = [
  {
    table: "novawear_users",
    collection: "users",
    sql: `INSERT INTO novawear_users
      (id,name,email,phone,role,status,verified_at,customer_id,employee_id,created_at,data)
      SELECT item->>'id', item->>'name', item->>'email', item->>'phone',
        item->>'role', item->>'status', NULLIF(item->>'emailVerifiedAt','')::timestamptz,
        item->>'customerId', item->>'employeeId', NULLIF(item->>'createdAt','')::timestamptz, item
      FROM jsonb_array_elements($1::jsonb) AS item`,
  },
  {
    table: "novawear_products",
    collection: "products",
    sql: `INSERT INTO novawear_products
      (id,sku,name,slug,category_id,audience,price,compare_price,stock,status,featured,sale_ends_at,created_at,data)
      SELECT item->>'id', item->>'sku', item->>'name', item->>'slug', item->>'categoryId',
        item->>'audience', COALESCE(NULLIF(item->>'price','')::bigint,0),
        COALESCE(NULLIF(item->>'comparePrice','')::bigint,0),
        COALESCE(NULLIF(item->>'stock','')::integer,0), item->>'status',
        COALESCE(NULLIF(item->>'featured','')::boolean,false),
        NULLIF(item->>'saleEndsAt','')::timestamptz,
        NULLIF(item->>'createdAt','')::timestamptz, item
      FROM jsonb_array_elements($1::jsonb) AS item`,
  },
  {
    table: "novawear_categories",
    collection: "categories",
    sql: `INSERT INTO novawear_categories
      (id,name,slug,audience,status,product_count,data)
      SELECT item->>'id', item->>'name', item->>'slug', item->>'audience',
        COALESCE(item->>'status','active'), COALESCE(NULLIF(item->>'productCount','')::integer,0), item
      FROM jsonb_array_elements($1::jsonb) AS item`,
  },
  {
    table: "novawear_orders",
    collection: "orders",
    sql: `INSERT INTO novawear_orders
      (id,customer_id,customer_name,customer_phone,status,payment_status,payment_method,total,tracking_code,created_at,data)
      SELECT item->>'id', item->>'customerId', item#>>'{customer,name}', item#>>'{customer,phone}',
        item->>'status', item->>'paymentStatus', item->>'paymentMethod',
        COALESCE(NULLIF(item->>'total','')::bigint,0), item->>'trackingCode',
        NULLIF(item->>'createdAt','')::timestamptz, item
      FROM jsonb_array_elements($1::jsonb) AS item`,
  },
  {
    table: "novawear_customers",
    collection: "customers",
    sql: `INSERT INTO novawear_customers
      (id,name,email,phone,address,tier,total_spent,order_count,status,created_at,data)
      SELECT item->>'id', item->>'name', item->>'email', item->>'phone', item->>'address',
        item->>'tier', COALESCE(NULLIF(item->>'totalSpent','')::bigint,0),
        COALESCE(NULLIF(item->>'orderCount','')::integer,0), item->>'status',
        NULLIF(item->>'createdAt','')::timestamptz, item
      FROM jsonb_array_elements($1::jsonb) AS item`,
  },
  {
    table: "novawear_employees",
    collection: "employees",
    sql: `INSERT INTO novawear_employees
      (id,employee_code,name,email,phone,role_title,department,status,join_date,shift,performance,data)
      SELECT item->>'id', item->>'employeeCode', item->>'name', item->>'email', item->>'phone',
        item->>'roleTitle', item->>'department', item->>'status',
        NULLIF(item->>'joinDate','')::date, item->>'shift',
        COALESCE(NULLIF(item->>'performance','')::numeric,0), item
      FROM jsonb_array_elements($1::jsonb) AS item`,
  },
  {
    table: "novawear_reviews",
    collection: "reviews",
    sql: `INSERT INTO novawear_reviews
      (id,product_id,customer_id,order_id,rating,status,created_at,data)
      SELECT item->>'id', item->>'productId', item->>'customerId', item->>'orderId',
        COALESCE(NULLIF(item->>'rating','')::integer,0), item->>'status',
        NULLIF(item->>'createdAt','')::timestamptz, item
      FROM jsonb_array_elements($1::jsonb) AS item`,
  },
  {
    table: "novawear_coupons",
    collection: "coupons",
    sql: `INSERT INTO novawear_coupons
      (id,code,type,value,min_order,usage_limit,used_count,status,starts_at,expires_at,data)
      SELECT COALESCE(item->>'id',item->>'code'), item->>'code', item->>'type',
        COALESCE(NULLIF(item->>'value','')::bigint,0),
        COALESCE(NULLIF(item->>'minOrder','')::bigint,0),
        COALESCE(NULLIF(item->>'usageLimit','')::integer,0),
        COALESCE(NULLIF(item->>'usedCount','')::integer,0),
        CASE WHEN COALESCE(NULLIF(item->>'active','')::boolean,false) THEN 'active' ELSE 'inactive' END,
        NULLIF(item->>'startsAt','')::timestamptz,
        NULLIF(item->>'expiresAt','')::timestamptz, item
      FROM jsonb_array_elements($1::jsonb) AS item`,
  },
  {
    table: "novawear_news",
    collection: "news",
    sql: `INSERT INTO novawear_news (id,title,category,status,published_at,data)
      SELECT item->>'id', item->>'title', item->>'category', item->>'status',
        NULLIF(item->>'publishedAt','')::timestamptz, item
      FROM jsonb_array_elements($1::jsonb) AS item`,
  },
  {
    table: "novawear_returns",
    collection: "returns",
    sql: `INSERT INTO novawear_returns
      (id,order_id,customer_id,type,reason,status,refund_amount,created_at,data)
      SELECT item->>'id', item->>'orderId', item->>'customerId', item->>'type',
        item->>'reason', item->>'status',
        COALESCE(NULLIF(item->>'refundAmount','')::bigint,0),
        NULLIF(item->>'createdAt','')::timestamptz, item
      FROM jsonb_array_elements($1::jsonb) AS item`,
  },
];

async function ensureProjectionSchema(pool) {
  for (const statement of projectionSchemas) await pool.query(statement);
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS novawear_users_email_idx ON novawear_users (LOWER(email))");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS novawear_products_slug_idx ON novawear_products (slug)");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS novawear_coupons_code_idx ON novawear_coupons (UPPER(code))");
}

async function syncProjections(client, data) {
  for (const projection of projectionQueries) {
    await client.query(`DELETE FROM ${projection.table}`);
    await client.query(projection.sql, [JSON.stringify(data[projection.collection] || [])]);
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
    const projectionData = JSON.parse(snapshot);
    this.writeQueue = this.writeQueue.catch(() => {}).then(async () => {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO novawear_app_state (id, data, updated_at)
           VALUES (1, $1::jsonb, NOW())
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
          [snapshot],
        );
        await syncProjections(client, projectionData);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    });
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
  await ensureProjectionSchema(pool);
  const result = await pool.query("SELECT data FROM novawear_app_state WHERE id = 1");
  const data = result.rows[0]?.data || createSeedData();
  applyCatalogMigration(data);
  const store = new PostgresStore(pool, data);
  await store.save();
  return store;
}

module.exports = {
  JsonStore,
  PostgresStore,
  createStoreFromEnv,
  ensureProjectionSchema,
  syncProjections,
};
