const crypto = require("crypto");

function sign(secret, body) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function createRefundService(options = {}) {
  const endpoint = String(options.endpoint || process.env.REFUND_PROVIDER_URL || "").trim();
  const secret = String(options.secret || process.env.REFUND_PROVIDER_SECRET || "").trim();
  const request = options.fetch || global.fetch;
  const configured = Boolean(endpoint && secret && request);

  async function initiate(refund) {
    if (!configured) return null;
    const body = JSON.stringify(refund);
    const response = await request(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": refund.idempotencyKey,
        "X-NOVA-Signature": sign(secret, body),
      },
      body,
      signal: AbortSignal.timeout(12000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.reference) {
      const error = new Error(result.message || "Nhà cung cấp chưa tiếp nhận yêu cầu hoàn tiền.");
      error.status = 502;
      error.code = "REFUND_PROVIDER_ERROR";
      throw error;
    }
    return { reference: String(result.reference), status: String(result.status || "processing") };
  }

  function verifyWebhook(rawBody, signature) {
    if (!configured || !signature) return false;
    const expected = sign(secret, rawBody);
    const actualBuffer = Buffer.from(String(signature));
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length
      && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  }

  return { configured, initiate, verifyWebhook };
}

module.exports = { createRefundService };
