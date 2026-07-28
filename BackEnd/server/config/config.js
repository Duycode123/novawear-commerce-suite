const mysql = require("mysql2");

// Compatibility connection for the legacy model files. The main API now uses
// the zero-setup JSON store in lib/store.js. Teams that still need MySQL can
// configure it without keeping credentials in source control.
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "datashop_db",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
});

module.exports = db;
