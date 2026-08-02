const assert = require("node:assert/strict");
const test = require("node:test");
const { createShippingService, mapGhnStatus } = require("../lib/shipping");
const { createRefundService } = require("../lib/refunds");

test("GHN adapter creates a traceable shipment and maps provider states", async () => {
  let sent;
  const service = createShippingService({
    provider: "ghn", token: "token", shopId: "123",
    fetch: async (_url, options) => {
      sent = JSON.parse(options.body);
      return {
        ok: true,
        async json() {
          return { code: 200, data: { order_code: "GHN123", total_fee: 32000, expected_delivery_time: "2026-08-05T08:00:00Z" } };
        },
      };
    },
  });
  const result = await service.createShipment({
    id: "ORD-1", total: 500000, paymentMethod: "bank_transfer", paymentStatus: "paid",
    customer: { name: "Nguyễn Văn A", phone: "0900000000", address: "Hà Nội", districtId: 1450, wardCode: "21012" },
    items: [{ productId: "p1", name: "Áo thun", quantity: 2, price: 250000 }],
  });
  assert.equal(result.trackingNumber, "GHN123");
  assert.equal(sent.client_order_code, "ORD-1");
  assert.equal(sent.cod_amount, 0);
  assert.equal(mapGhnStatus("delivering"), "shipping");
  assert.equal(mapGhnStatus("delivered"), "delivered");
});

test("refund adapter sends idempotency and verifies signed callbacks", async () => {
  let headers;
  const service = createRefundService({
    endpoint: "https://payout.example/refunds", secret: "test-secret",
    fetch: async (_url, options) => {
      headers = options.headers;
      return { ok: true, async json() { return { reference: "RF-001", status: "processing" }; } };
    },
  });
  const result = await service.initiate({ idempotencyKey: "refund:return-1:1", amount: 100000 });
  assert.equal(result.reference, "RF-001");
  assert.equal(headers["Idempotency-Key"], "refund:return-1:1");
  const crypto = require("node:crypto");
  const body = JSON.stringify({ reference: "RF-001", status: "succeeded" });
  const signature = crypto.createHmac("sha256", "test-secret").update(body).digest("hex");
  assert.equal(service.verifyWebhook(body, signature), true);
  assert.equal(service.verifyWebhook(body, "invalid"), false);
});
