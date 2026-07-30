const nodemailer = require("nodemailer");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
}

function usable(value) {
  const normalized = String(value || "").trim();
  return Boolean(normalized && !/replace-with|your-|example/i.test(normalized));
}

function emailShell(title, content) {
  return `<!doctype html>
  <html lang="vi">
    <body style="margin:0;background:#f3f1eb;font-family:Arial,sans-serif;color:#101820">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:32px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border:1px solid #dedbd3">
            <tr><td style="padding:24px 30px;background:#101820;color:#fff;font-size:20px;font-weight:700;letter-spacing:2px">NOVAWEAR</td></tr>
            <tr><td style="padding:34px 30px">
              <h1 style="margin:0 0 20px;font-size:28px;line-height:1.2">${escapeHtml(title)}</h1>
              ${content}
            </td></tr>
            <tr><td style="padding:20px 30px;border-top:1px solid #dedbd3;color:#6b7375;font-size:12px;line-height:1.6">
              Email được gửi tự động từ NOVAWEAR. Không chia sẻ mã xác minh hoặc thông tin đơn hàng cho người khác.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;
}

function createMailer(options = {}) {
  const host = String(options.host || process.env.SMTP_HOST || "").trim();
  const port = Number(options.port || process.env.SMTP_PORT || 587);
  const secure = options.secure ?? String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = String(options.user || process.env.SMTP_USER || "").trim();
  const pass = String(options.pass || process.env.SMTP_PASSWORD || "");
  const from = String(options.from || process.env.MAIL_FROM || "").trim();
  const replyTo = String(options.replyTo || process.env.MAIL_REPLY_TO || "").trim();
  const frontendBaseUrl = String(options.frontendBaseUrl || process.env.FRONTEND_BASE_URL || "http://localhost:3000")
    .replace(/\/$/, "");
  const connectionTimeout = Number(options.connectionTimeout || process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000);
  const greetingTimeout = Number(options.greetingTimeout || process.env.SMTP_GREETING_TIMEOUT_MS || 10000);
  const socketTimeout = Number(options.socketTimeout || process.env.SMTP_SOCKET_TIMEOUT_MS || 20000);
  const configured = Boolean(options.transporter || (
    usable(host)
    && usable(from)
    && (!user || (usable(user) && usable(pass)))
  ));
  const transporter = options.transporter || (configured
    ? nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user ? { auth: { user, pass } } : {}),
      requireTLS: !secure,
      connectionTimeout,
      greetingTimeout,
      socketTimeout,
    })
    : null);

  async function send(message) {
    if (!transporter || !from) {
      const error = new Error("Dịch vụ email chưa được cấu hình.");
      error.code = "EMAIL_NOT_CONFIGURED";
      throw error;
    }
    const info = await transporter.sendMail({
      from,
      replyTo: replyTo || undefined,
      ...message,
    });
    if (Array.isArray(info.rejected) && info.rejected.length) {
      const error = new Error("Máy chủ email từ chối địa chỉ người nhận.");
      error.code = "EMAIL_REJECTED";
      throw error;
    }
    return info;
  }

  return {
    configured,
    async verifyConnection() {
      if (!transporter) return false;
      await transporter.verify();
      return true;
    },
    async sendVerification({ to, name, code, purpose = "account" }) {
      const checkout = purpose === "checkout";
      const title = checkout ? "Xác nhận email trước khi đặt hàng" : "Xác minh tài khoản NOVAWEAR";
      return send({
        to,
        subject: `${code} là mã xác minh NOVAWEAR`,
        text: `Xin chào ${name || "bạn"}, mã xác minh của bạn là ${code}. Mã có hiệu lực 10 phút và chỉ dùng một lần.`,
        html: emailShell(title, `
          <p style="margin:0 0 22px;color:#525c60;line-height:1.7">Xin chào ${escapeHtml(name || "bạn")}, dùng mã dưới đây để ${checkout ? "xác nhận địa chỉ email và tiếp tục đặt hàng" : "kích hoạt tài khoản"}.</p>
          <div style="padding:22px;text-align:center;background:#f3f1eb;font-size:34px;font-weight:800;letter-spacing:9px">${escapeHtml(code)}</div>
          <p style="margin:20px 0 0;color:#6b7375;font-size:13px;line-height:1.7">Mã có hiệu lực trong 10 phút, tối đa 5 lần nhập và chỉ dùng một lần. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.</p>
        `),
      });
    },
    async sendOrderConfirmation({ to, order }) {
      const itemRows = (order.items || []).map((item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e2db">${escapeHtml(item.name)}<br><small>${escapeHtml(item.color)} · Size ${escapeHtml(item.size)} · SL ${Number(item.quantity)}</small></td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #e5e2db">${money(item.price * item.quantity)}</td>
        </tr>`).join("");
      return send({
        to,
        subject: `NOVAWEAR đã tiếp nhận đơn ${order.id}`,
        text: `Đơn ${order.id} đã được tiếp nhận. Mã tra cứu: ${order.trackingCode}. Tổng thanh toán: ${money(order.total)}.`,
        html: emailShell(`Đã tiếp nhận đơn ${order.id}`, `
          <p style="color:#525c60;line-height:1.7">Xin chào ${escapeHtml(order.customer?.name)}, đơn hàng của bạn đã được ghi nhận. Hãy giữ mã tra cứu bên dưới.</p>
          <div style="padding:18px;background:#f3f1eb"><b>Mã tra cứu: ${escapeHtml(order.trackingCode)}</b><br><span style="font-size:13px">Trạng thái: Đã tiếp nhận</span></div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;font-size:14px">${itemRows}</table>
          <p style="margin:22px 0 0;text-align:right;font-size:18px"><b>Tổng: ${money(order.total)}</b></p>
          <p style="margin:24px 0 0"><a href="${escapeHtml(`${frontendBaseUrl}/tra-cuu`)}" style="display:inline-block;padding:12px 18px;background:#101820;color:#fff;text-decoration:none">Tra cứu đơn hàng</a></p>
          <p style="color:#6b7375;font-size:13px;line-height:1.7">Nếu bạn không tạo đơn này, hãy liên hệ NOVAWEAR ngay và cung cấp mã đơn ở trên.</p>
        `),
      });
    },
  };
}

module.exports = { createMailer };
