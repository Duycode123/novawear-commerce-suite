const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { createApp } = require("../app");

const TOTAL_REQUESTS = Number(process.env.LOAD_TEST_REQUESTS || 600);
const CONCURRENCY = Number(process.env.LOAD_TEST_CONCURRENCY || 30);
const P95_BUDGET_MS = Number(process.env.LOAD_TEST_P95_MS || 1000);
const ROUTES = ["/health", "/products?limit=100", "/categories", "/config"];

function percentile(values, ratio) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] || 0;
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "novawear-load-"));
  const app = createApp({ dataFile: path.join(tempDir, "store.json") });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const durations = [];
  const failures = [];
  let cursor = 0;
  const suiteStartedAt = performance.now();

  async function worker() {
    while (cursor < TOTAL_REQUESTS) {
      const requestIndex = cursor;
      cursor += 1;
      const route = ROUTES[requestIndex % ROUTES.length];
      const startedAt = performance.now();
      try {
        const response = await fetch(`${baseUrl}${route}`, {
          headers: { Accept: "application/json" },
        });
        await response.arrayBuffer();
        durations.push(performance.now() - startedAt);
        if (!response.ok) failures.push(`${route}: HTTP ${response.status}`);
      } catch (error) {
        failures.push(`${route}: ${error.message}`);
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    const elapsedMs = performance.now() - suiteStartedAt;
    const summary = {
      requests: TOTAL_REQUESTS,
      concurrency: CONCURRENCY,
      failures: failures.length,
      requestsPerSecond: Number((TOTAL_REQUESTS / (elapsedMs / 1000)).toFixed(1)),
      p50Ms: Number(percentile(durations, 0.5).toFixed(1)),
      p95Ms: Number(percentile(durations, 0.95).toFixed(1)),
      p99Ms: Number(percentile(durations, 0.99).toFixed(1)),
    };
    console.log(`NOVAWEAR load smoke: ${JSON.stringify(summary)}`);
    if (failures.length) throw new Error(`Load test có ${failures.length} phản hồi lỗi: ${failures.slice(0, 3).join("; ")}`);
    if (summary.p95Ms > P95_BUDGET_MS) {
      throw new Error(`P95 ${summary.p95Ms}ms vượt ngân sách ${P95_BUDGET_MS}ms.`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    const resolvedTempDir = path.resolve(tempDir);
    if (resolvedTempDir.startsWith(path.resolve(os.tmpdir()))) {
      fs.rmSync(resolvedTempDir, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
