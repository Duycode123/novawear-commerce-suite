const nodemailer = require("nodemailer");

const COLORS = {
  ink: "#0e1a24",
  paper: "#f6f4ef",
  card: "#ffffff",
  line: "#e4e0d8",
  muted: "#66717a",
  accent: "#b64035",
  accentSoft: "#faece8",
  lime: "#d8f267",
  paleBlue: "#eef5f8",
};

const ORDER_LABELS = {
  pending: "Đã tiếp nhận",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  ready_to_ship: "Chờ bàn giao vận chuyển",
  shipping: "Đang giao hàng",
  delivery_failed: "Giao hàng chưa thành công",
  delivered: "Giao thành công",
  cancelled: "Đã hủy",
};

const PAYMENT_LABELS = {
  pending: "Chờ thanh toán khi nhận hàng",
  awaiting: "Chờ chuyển khoản",
  paid: "Đã thanh toán",
  refund_pending: "Đang đối soát hoàn tiền",
  refunded: "Đã hoàn tiền",
  partially_refunded: "Đã hoàn tiền một phần",
  failed: "Thanh toán thất bại",
  expired: "Đã hết hạn thanh toán",
  cancelled: "Đã hủy thanh toán",
  review_required: "Cần đối soát thanh toán",
};

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

function dateTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function usable(value) {
  const normalized = String(value || "").trim();
  return Boolean(normalized && !/replace-with|your-|example/i.test(normalized));
}

function button(url, label, variant = "dark") {
  const background = variant === "accent" ? COLORS.accent : COLORS.ink;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0">
      <tr>
        <td bgcolor="${background}" style="border-radius:2px;background:${background}">
          <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 20px;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:.04em;text-decoration:none;white-space:nowrap">${escapeHtml(label)} <span style="font-size:16px">→</span></a>
        </td>
      </tr>
    </table>`;
}

function statusPill(label, tone = "ink") {
  const background = tone === "accent" ? COLORS.accentSoft : tone === "lime" ? "#eef7cd" : COLORS.paper;
  const color = tone === "accent" ? COLORS.accent : COLORS.ink;
  return `<span style="display:inline-block;padding:7px 10px;border-radius:999px;background:${background};color:${color};font-size:11px;font-weight:700;letter-spacing:.04em">${escapeHtml(label)}</span>`;
}

function infoGrid(cells) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;border:1px solid ${COLORS.line};border-radius:2px;overflow:hidden"><tr>${cells.map((cell) => `
    <td class="info-cell" width="${Math.floor(100 / cells.length)}%" style="padding:14px 16px;border-right:1px solid ${COLORS.line};vertical-align:top">
      <div style="font-size:10px;line-height:1.4;color:${COLORS.muted};letter-spacing:.08em;text-transform:uppercase">${escapeHtml(cell.label)}</div>
      <div style="margin-top:6px;font-size:14px;line-height:1.45;font-weight:700;color:${COLORS.ink}">${escapeHtml(cell.value)}</div>
    </td>`).join("")}</tr></table>`;
}

function stepStrip(steps) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0;border-top:1px solid ${COLORS.line};border-bottom:1px solid ${COLORS.line}"><tr>${steps.map((step, index) => `
    <td class="step-cell" width="${Math.floor(100 / steps.length)}%" style="padding:15px 10px 16px;vertical-align:top;border-right:${index < steps.length - 1 ? `1px solid ${COLORS.line}` : "0"}">
      <div style="font-size:10px;color:${COLORS.accent};font-weight:700;letter-spacing:.1em">0${index + 1}</div>
      <div style="margin-top:7px;font-size:12px;line-height:1.45;color:${COLORS.ink};font-weight:700">${escapeHtml(step.title)}</div>
      <div style="margin-top:4px;font-size:11px;line-height:1.5;color:${COLORS.muted}">${escapeHtml(step.text)}</div>
    </td>`).join("")}</tr></table>`;
}

function emailShell({ title, eyebrow = "NOVAWEAR / CUSTOMER CARE", preheader = "", content, footerNote = "Email này được gửi tự động; vui lòng không trả lời trực tiếp." }) {
  return `<!doctype html>
  <html lang="vi">
    <head>
      <meta charset="utf-8">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(title)}</title>
      <style>
        @media only screen and (max-width:640px) {
          .page-pad { padding:16px 8px !important; }
          .email-card { width:100% !important; }
          .content-pad { padding:28px 20px !important; }
          .header-pad { padding:18px 20px !important; }
          .info-cell, .step-cell { display:block !important; width:100% !important; border-right:0 !important; border-bottom:1px solid ${COLORS.line} !important; box-sizing:border-box !important; }
          .info-cell:last-child, .step-cell:last-child { border-bottom:0 !important; }
          .item-image { width:52px !important; height:52px !important; }
          .hero-title { font-size:30px !important; }
        }
      </style>
    </head>
    <body style="margin:0;background:${COLORS.paper};font-family:Arial,Helvetica,sans-serif;color:${COLORS.ink};-webkit-font-smoothing:antialiased">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td class="page-pad" align="center" style="padding:36px 16px">
          <table role="presentation" class="email-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;background:${COLORS.card};border:1px solid ${COLORS.line}">
            <tr><td class="header-pad" style="padding:22px 30px;background:${COLORS.ink}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="vertical-align:middle">
                  <span style="display:inline-block;width:29px;height:29px;border-radius:50%;background:${COLORS.accent};color:#ffffff;text-align:center;line-height:29px;font-size:15px;font-weight:800;vertical-align:middle">N</span>
                  <span style="margin-left:9px;color:#ffffff;font-size:14px;font-weight:800;letter-spacing:.19em;vertical-align:middle">NOVAWEAR</span>
                </td>
                <td align="right" style="color:#d9e0e3;font-size:11px;letter-spacing:.05em">NOVA / 2026</td>
              </tr></table>
            </td></tr>
            <tr><td class="content-pad" style="padding:38px 40px 34px">
              <div style="font-size:11px;line-height:1.4;color:${COLORS.accent};font-weight:700;letter-spacing:.16em;text-transform:uppercase">${escapeHtml(eyebrow)}</div>
              <h1 class="hero-title" style="margin:12px 0 0;color:${COLORS.ink};font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:400;line-height:1.08;letter-spacing:-.03em">${escapeHtml(title)}</h1>
              ${content}
            </td></tr>
            <tr><td style="padding:22px 30px;background:${COLORS.ink}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:.1em">NOVAWEAR</td>
                <td align="right" style="color:#b9c2c6;font-size:11px">Mặc đẹp, theo nhịp của bạn.</td>
              </tr></table>
              <div style="margin-top:14px;padding-top:14px;border-top:1px solid #33404a;color:#aeb9be;font-size:11px;line-height:1.65">${escapeHtml(footerNote)}<br>Hỗ trợ: hello@novawear.vn · 1900 0000</div>
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

  async function sendVerification({ to, name, code, purpose = "account", resumeToken = "" }) {
    const checkout = purpose === "checkout";
    const passwordReset = purpose === "password-reset";
    const title = checkout
      ? "Xác nhận email trước khi đặt hàng"
      : passwordReset
        ? "Đặt lại mật khẩu NOVAWEAR"
        : "Xác minh tài khoản NOVAWEAR";
    const action = checkout
      ? "xác nhận địa chỉ email và tiếp tục đặt hàng"
      : passwordReset
        ? "đặt lại mật khẩu tài khoản"
        : "kích hoạt tài khoản";
    const ctaPath = checkout
      ? `/thanh-toan${resumeToken ? `?resume=${encodeURIComponent(resumeToken)}` : ""}`
      : "/dang-nhap";
    const text = `Xin chào ${name || "bạn"}, mã xác minh NOVAWEAR của bạn là ${code}. Mã có hiệu lực 10 phút, chỉ dùng một lần.`;
    return send({
      to,
      subject: `${code} · Mã xác minh NOVAWEAR`,
      text,
      html: emailShell({
        title,
        eyebrow: checkout ? "NOVA CHECKOUT / VERIFY" : passwordReset ? "NOVA ACCOUNT / SECURITY" : "NOVA ACCOUNT / VERIFY",
        preheader: `Mã ${code} dùng một lần, hết hạn sau 10 phút.`,
        content: `
          <p style="margin:20px 0 0;color:${COLORS.muted};font-size:15px;line-height:1.75">Xin chào ${escapeHtml(name || "bạn")}, hãy dùng mã dưới đây để ${action}.</p>
          <div style="margin:26px 0 0;padding:25px 18px;text-align:center;background:${COLORS.ink};border-radius:2px">
            <div style="color:#b9c2c6;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">MÃ DÙNG MỘT LẦN</div>
            <div style="margin-top:12px;color:#ffffff;font-size:36px;line-height:1;font-weight:800;letter-spacing:9px">${escapeHtml(code)}</div>
            <div style="margin-top:13px;color:${COLORS.lime};font-size:12px">Có hiệu lực trong 10 phút</div>
          </div>
          ${button(`${frontendBaseUrl}${ctaPath}`, checkout ? "Quay lại thanh toán" : passwordReset ? "Mở trang tài khoản" : "Mở NOVAWEAR", "accent")}
          ${stepStrip([
            { title: "Nhập mã", text: "Dùng đúng 6 chữ số trong email này." },
            { title: "Xác nhận", text: "Mã chỉ dùng một lần và có giới hạn thử." },
            { title: "Tiếp tục", text: "Bạn có thể quay lại bước đang làm." },
          ])}
          <div style="margin-top:22px;padding:14px 16px;background:${COLORS.paper};color:${COLORS.muted};font-size:12px;line-height:1.7"><b style="color:${COLORS.ink}">Lưu ý bảo mật:</b> NOVAWEAR không bao giờ yêu cầu bạn gửi mã này qua tin nhắn. Nếu bạn không yêu cầu, hãy bỏ qua email.</div>
        `,
      }),
    });
  }

  async function sendOrderConfirmation({ to, order }) {
    const paymentLabel = PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus || "Đang xử lý";
    const paymentTone = order.paymentStatus === "awaiting" ? "accent" : "lime";
    const itemRows = (order.items || []).map((item) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid ${COLORS.line};vertical-align:top">
          <div style="font-size:14px;line-height:1.45;font-weight:700;color:${COLORS.ink}">${escapeHtml(item.name)}</div>
          <div style="margin-top:4px;color:${COLORS.muted};font-size:12px;line-height:1.5">${escapeHtml(item.color || "Màu mặc định")} · Size ${escapeHtml(item.size || "Mặc định")} · SL ${Number(item.quantity || 0)}</div>
        </td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid ${COLORS.line};vertical-align:top;color:${COLORS.ink};font-size:14px;font-weight:700;white-space:nowrap">${money(Number(item.price || 0) * Number(item.quantity || 0))}</td>
      </tr>`).join("");
    const address = order.customer?.address || "Địa chỉ giao hàng sẽ được xác nhận cùng NOVAWEAR.";
    const paymentNote = order.paymentStatus === "awaiting"
      ? "Đơn sẽ được xác nhận ngay sau khi hệ thống đối soát đúng khoản chuyển khoản."
      : "Bạn thanh toán khi nhận hàng; nhân viên sẽ liên hệ trước khi giao.";
    const text = `Đơn ${order.id} đã được tiếp nhận. Mã tra cứu: ${order.trackingCode}. Tổng thanh toán: ${money(order.total)}. Trạng thái thanh toán: ${paymentLabel}.`;
    return send({
      to,
      subject: `NOVAWEAR · Đã tiếp nhận đơn ${order.id}`,
      text,
      html: emailShell({
        title: "Đơn hàng đã được tiếp nhận",
        eyebrow: `NOVA ORDER / ${order.id}`,
        preheader: `Đơn ${order.id} đã được ghi nhận · ${money(order.total)}.`,
        content: `
          <p style="margin:20px 0 0;color:${COLORS.muted};font-size:15px;line-height:1.75">Xin chào ${escapeHtml(order.customer?.name || "bạn")}, cảm ơn bạn đã chọn NOVAWEAR. Chúng tôi đã ghi nhận thông tin đặt hàng.</p>
          ${infoGrid([
            { label: "Mã đơn", value: order.id },
            { label: "Mã tra cứu", value: order.trackingCode },
            { label: "Ngày đặt", value: dateTime(order.createdAt) },
          ])}
          <div style="margin:22px 0 0;padding:14px 16px;background:${paymentTone === "accent" ? COLORS.accentSoft : "#eef7cd"};border-left:3px solid ${paymentTone === "accent" ? COLORS.accent : "#8dad28"}">
            ${statusPill(paymentLabel, paymentTone)}
            <div style="margin-top:9px;color:${COLORS.muted};font-size:12px;line-height:1.6">${escapeHtml(paymentNote)}</div>
          </div>
          <div style="margin:30px 0 0;font-size:11px;color:${COLORS.accent};font-weight:700;letter-spacing:.15em;text-transform:uppercase">SẢN PHẨM TRONG ĐƠN</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px">${itemRows || `<tr><td style="padding:14px 0;color:${COLORS.muted}">Thông tin sản phẩm đang được cập nhật.</td></tr>`}</table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;font-size:13px;line-height:1.7">
            <tr><td style="padding:4px 0;color:${COLORS.muted}">Tạm tính</td><td align="right" style="padding:4px 0">${money(order.subtotal)}</td></tr>
            <tr><td style="padding:4px 0;color:${COLORS.muted}">Phí giao hàng</td><td align="right" style="padding:4px 0">${money(order.shippingFee)}</td></tr>
            ${Number(order.discount || 0) > 0 ? `<tr><td style="padding:4px 0;color:${COLORS.muted}">Ưu đãi</td><td align="right" style="padding:4px 0;color:${COLORS.accent}">-${money(order.discount)}</td></tr>` : ""}
            <tr><td style="padding:12px 0 0;border-top:1px solid ${COLORS.line};font-size:15px;font-weight:700">Tổng thanh toán</td><td align="right" style="padding:12px 0 0;border-top:1px solid ${COLORS.line};font-size:18px;font-weight:800">${money(order.total)}</td></tr>
          </table>
          <div style="margin-top:24px;padding:16px;background:${COLORS.paper}">
            <div style="font-size:10px;color:${COLORS.accent};font-weight:700;letter-spacing:.14em;text-transform:uppercase">GIAO ĐẾN</div>
            <div style="margin-top:7px;font-size:14px;font-weight:700">${escapeHtml(order.customer?.name || "")}</div>
            <div style="margin-top:4px;color:${COLORS.muted};font-size:12px;line-height:1.6">${escapeHtml(address)}<br>${escapeHtml(order.customer?.phone || "")}</div>
          </div>
          ${button(`${frontendBaseUrl}/tra-cuu`, "Theo dõi đơn hàng", "accent")}
          <p style="margin:16px 0 0;color:${COLORS.muted};font-size:12px;line-height:1.7">Nếu thông tin trên chưa đúng, hãy liên hệ NOVAWEAR sớm và cung cấp mã đơn ${escapeHtml(order.id)}.</p>
        `,
      }),
    });
  }

  async function sendOrderStatusUpdate({ to, order, event, paymentLabel }) {
    const statusLabel = event?.label || ORDER_LABELS[order.status] || order.status || "Đơn hàng được cập nhật";
    const resolvedPaymentLabel = paymentLabel || PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus;
    const tone = order.status === "cancelled" || order.status === "delivery_failed" ? "accent" : order.status === "delivered" ? "lime" : "ink";
    const note = event?.note || "NOVAWEAR vừa cập nhật thông tin đơn hàng của bạn.";
    const orderSteps = ["pending", "confirmed", "packing", "ready_to_ship", "shipping", "delivered"];
    const currentIndex = orderSteps.indexOf(order.status);
    const progress = currentIndex >= 0 ? Math.max(12, Math.round((currentIndex / (orderSteps.length - 1)) * 100)) : 0;
    const text = `Đơn ${order.id}: ${statusLabel}. ${note} Thanh toán: ${resolvedPaymentLabel}. Mã tra cứu: ${order.trackingCode}.`;
    return send({
      to,
      subject: `${order.id} · ${statusLabel}`,
      text,
      html: emailShell({
        title: statusLabel,
        eyebrow: `NOVA ORDER / ${order.id}`,
        preheader: `${statusLabel} · Mã tra cứu ${order.trackingCode}.`,
        content: `
          <p style="margin:20px 0 0;color:${COLORS.muted};font-size:15px;line-height:1.75">Xin chào ${escapeHtml(order.customer?.name || "bạn")}, đây là cập nhật mới nhất cho đơn hàng của bạn.</p>
          <div style="margin:24px 0 0;padding:20px;background:${tone === "accent" ? COLORS.accentSoft : tone === "lime" ? "#eef7cd" : COLORS.paper};border-left:3px solid ${tone === "accent" ? COLORS.accent : tone === "lime" ? "#8dad28" : COLORS.ink}">
            ${statusPill(statusLabel, tone)}
            <div style="margin-top:12px;color:${COLORS.ink};font-size:14px;line-height:1.7">${escapeHtml(note)}</div>
            <div style="margin-top:9px;color:${COLORS.muted};font-size:12px;line-height:1.6">Thanh toán: ${escapeHtml(resolvedPaymentLabel)}<br>Mã tra cứu: <b style="color:${COLORS.ink}">${escapeHtml(order.trackingCode)}</b></div>
          </div>
          ${order.status !== "cancelled" && order.status !== "delivery_failed" ? `<div style="margin:26px 0 0;height:6px;background:${COLORS.line};border-radius:99px"><div style="width:${progress}%;height:6px;background:${COLORS.accent};border-radius:99px"></div></div><div style="margin-top:8px;color:${COLORS.muted};font-size:11px">Tiến trình xử lý đơn hàng</div>` : ""}
          ${order.shipment?.trackingNumber ? `<div style="margin-top:22px">${infoGrid([{ label: "Đơn vị vận chuyển", value: order.shipment.carrier || "Đang cập nhật" }, { label: "Mã vận đơn", value: order.shipment.trackingNumber }, { label: "Dự kiến giao", value: dateTime(order.shipment.estimatedDeliveryAt) || "Đang cập nhật" }])}</div>` : ""}
          ${button(`${frontendBaseUrl}/tra-cuu`, "Theo dõi đơn hàng", tone === "accent" ? "accent" : "dark")}
          <p style="margin:16px 0 0;color:${COLORS.muted};font-size:12px;line-height:1.7">Bạn có thể xem lại lịch sử xử lý và thông tin giao hàng bằng mã tra cứu trong email này.</p>
        `,
      }),
    });
  }

  async function sendReturnStatusUpdate({ to, order, returnRequest, event }) {
    const typeLabel = returnRequest.type === "exchange" ? "đổi sản phẩm" : "trả sản phẩm";
    const statusLabel = event?.label || returnRequest.status || "Cập nhật đổi trả";
    const refundLine = returnRequest.type === "return" && returnRequest.refundAmount
      ? `<div style="margin-top:20px">${infoGrid([{ label: "Số tiền dự kiến hoàn", value: money(returnRequest.refundAmount) }, { label: "Đơn gốc", value: order.id }])}</div>`
      : infoGrid([{ label: "Yêu cầu", value: returnRequest.id }, { label: "Đơn gốc", value: order.id }]);
    const text = `Yêu cầu ${typeLabel} ${returnRequest.id} của đơn ${order.id}: ${statusLabel}. ${event?.note || ""}`;
    return send({
      to,
      subject: `${returnRequest.id} · ${statusLabel}`,
      text,
      html: emailShell({
        title: "Cập nhật yêu cầu đổi trả",
        eyebrow: `NOVA CARE / ${returnRequest.id}`,
        preheader: `${statusLabel} · Yêu cầu ${returnRequest.id}.`,
        content: `
          <p style="margin:20px 0 0;color:${COLORS.muted};font-size:15px;line-height:1.75">Yêu cầu ${escapeHtml(typeLabel)} của bạn vừa được NOVAWEAR cập nhật.</p>
          <div style="margin:24px 0 0;padding:20px;background:${COLORS.paper};border-left:3px solid ${COLORS.accent}">
            ${statusPill(statusLabel, "accent")}
            <div style="margin-top:12px;color:${COLORS.ink};font-size:14px;line-height:1.7">${escapeHtml(event?.note || "NOVAWEAR đang tiếp tục xử lý yêu cầu của bạn.")}</div>
          </div>
          ${refundLine}
          ${button(`${frontendBaseUrl}/doi-tra`, "Xem yêu cầu đổi trả", "accent")}
          <p style="margin:16px 0 0;color:${COLORS.muted};font-size:12px;line-height:1.7">Vui lòng giữ nguyên tem, phụ kiện và tình trạng sản phẩm theo điều kiện đổi trả của NOVAWEAR.</p>
        `,
      }),
    });
  }

  return {
    configured,
    async verifyConnection() {
      if (!transporter) return false;
      await transporter.verify();
      return true;
    },
    sendVerification,
    sendOrderConfirmation,
    sendOrderStatusUpdate,
    sendReturnStatusUpdate,
  };
}

module.exports = { createMailer };
