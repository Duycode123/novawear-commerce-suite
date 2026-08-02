const test = require("node:test");
const assert = require("node:assert/strict");
const { createMailer } = require("../lib/mailer");

function makeMailer(sent) {
  return createMailer({
    from: "NOVAWEAR <hello@novawear.vn>",
    frontendBaseUrl: "https://novawear.example",
    transporter: {
      async sendMail(message) {
        sent.push(message);
        return { accepted: [message.to], rejected: [] };
      },
    },
  });
}

test("transactional email templates are branded, responsive and escape customer data", async () => {
  const sent = [];
  const mailer = makeMailer(sent);
  await mailer.sendVerification({ to: "duy@example.com", name: "<Duy>", code: "123456" });
  await mailer.sendOrderConfirmation({
    to: "duy@example.com",
    order: {
      id: "ORD-2026-001",
      trackingCode: "NVA26ABC123",
      createdAt: "2026-08-02T10:00:00.000Z",
      customer: { name: "Duy", address: "Hà Nội", phone: "0900000000" },
      items: [{ name: "Áo <thun>", color: "Đen", size: "M", quantity: 1, price: 289000 }],
      subtotal: 289000,
      shippingFee: 30000,
      discount: 0,
      total: 319000,
      paymentStatus: "awaiting",
    },
  });
  await mailer.sendOrderStatusUpdate({
    to: "duy@example.com",
    order: {
      id: "ORD-2026-001",
      trackingCode: "NVA26ABC123",
      status: "shipping",
      paymentStatus: "paid",
      customer: { name: "Duy" },
      shipment: { carrier: "GHN", trackingNumber: "GHN123", estimatedDeliveryAt: "2026-08-04T10:00:00.000Z" },
    },
    event: { label: "Đang giao hàng", note: "Đơn đã rời kho." },
  });
  await mailer.sendReturnStatusUpdate({
    to: "duy@example.com",
    order: { id: "ORD-2026-001" },
    returnRequest: { id: "RET-001", type: "return", status: "approved", refundAmount: 289000 },
    event: { label: "Đã chấp thuận", note: "Vui lòng gửi sản phẩm về kho." },
  });

  assert.equal(sent.length, 4);
  for (const message of sent) {
    assert.match(message.html, /NOVAWEAR/);
    assert.match(message.html, /@media only screen and \(max-width:640px\)/);
    assert.match(message.html, /Mặc đẹp, theo nhịp của bạn/);
    assert.ok(message.html.includes("https://novawear.example"));
  }
  assert.match(sent[0].html, /&lt;Duy&gt;/);
  assert.match(sent[0].html, /123456/);
  assert.match(sent[1].html, /Chờ chuyển khoản/);
  assert.match(sent[1].html, /319\.000/);
  assert.match(sent[2].html, /GHN123/);
  assert.match(sent[3].html, /289\.000/);
});
