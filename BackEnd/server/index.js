const { createApp } = require("./app");

const port = Number(process.env.PORT || 5000);
const app = createApp();

const server = app.listen(port, () => {
  console.log(`NOVAWEAR API đang chạy tại http://localhost:${port}`);
});

function shutdown(signal) {
  console.log(`\nNhận ${signal}, đang dừng máy chủ...`);
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = { app, server };
