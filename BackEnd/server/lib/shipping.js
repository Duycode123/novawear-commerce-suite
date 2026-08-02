function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createShippingService(options = {}) {
  const provider = String(options.provider || process.env.SHIPPING_PROVIDER || "manual").toLowerCase();
  const token = String(options.token || process.env.GHN_TOKEN || "").trim();
  const shopId = String(options.shopId || process.env.GHN_SHOP_ID || "").trim();
  const baseUrl = String(options.baseUrl || process.env.GHN_API_BASE_URL
    || "https://online-gateway.ghn.vn/shiip/public-api/v2").replace(/\/$/, "");
  const request = options.fetch || global.fetch;
  const configured = provider === "ghn" && Boolean(token && shopId && request);

  async function createShipment(order, input = {}) {
    if (!configured) {
      const error = new Error("GHN chưa được cấu hình. Bạn vẫn có thể bàn giao thủ công bằng mã vận đơn.");
      error.code = "SHIPPING_NOT_CONFIGURED";
      error.status = 503;
      throw error;
    }
    const customer = order.customer || {};
    const toDistrictId = positiveInt(input.toDistrictId || customer.districtId, 0);
    const toWardCode = String(input.toWardCode || customer.wardCode || "").trim();
    if (!toDistrictId || !toWardCode) {
      const error = new Error("Địa chỉ giao hàng thiếu mã quận/huyện hoặc phường/xã GHN.");
      error.code = "SHIPPING_ADDRESS_INCOMPLETE";
      error.status = 400;
      throw error;
    }
    const codAmount = order.paymentMethod === "cod" && order.paymentStatus !== "paid"
      ? Number(order.total || 0) : 0;
    const payload = {
      payment_type_id: positiveInt(process.env.GHN_PAYMENT_TYPE_ID, 1),
      required_note: String(input.requiredNote || process.env.GHN_REQUIRED_NOTE || "CHOXEMHANGKHONGTHU"),
      client_order_code: order.id,
      to_name: customer.name,
      to_phone: customer.phone,
      to_address: customer.address,
      to_ward_code: toWardCode,
      to_district_id: toDistrictId,
      cod_amount: codAmount,
      insurance_value: Math.min(Number(order.total || 0), 10000000),
      weight: positiveInt(input.weight, positiveInt(process.env.GHN_DEFAULT_WEIGHT_GRAMS, 500)),
      length: positiveInt(input.length, positiveInt(process.env.GHN_DEFAULT_LENGTH_CM, 25)),
      width: positiveInt(input.width, positiveInt(process.env.GHN_DEFAULT_WIDTH_CM, 20)),
      height: positiveInt(input.height, positiveInt(process.env.GHN_DEFAULT_HEIGHT_CM, 8)),
      service_type_id: positiveInt(input.serviceTypeId, positiveInt(process.env.GHN_SERVICE_TYPE_ID, 2)),
      note: String(input.note || order.note || "").slice(0, 500),
      items: (order.items || []).map((item) => ({
        name: String(item.name || "Sản phẩm NOVAWEAR").slice(0, 200),
        code: String(item.sku || item.productId || "").slice(0, 50),
        quantity: positiveInt(item.quantity, 1),
        price: Number(item.price || 0),
        weight: positiveInt(item.weight, positiveInt(process.env.GHN_ITEM_WEIGHT_GRAMS, 250)),
      })),
    };
    const response = await request(`${baseUrl}/shipping-order/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Token: token, ShopId: shopId },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || Number(result.code) !== 200 || !result.data?.order_code) {
      const error = new Error(result.message_display || result.message || "GHN chưa thể tạo vận đơn.");
      error.code = "SHIPPING_PROVIDER_ERROR";
      error.status = 502;
      throw error;
    }
    return {
      provider: "ghn",
      carrier: "GHN",
      trackingNumber: result.data.order_code,
      estimatedDeliveryAt: result.data.expected_delivery_time || null,
      fee: Number(result.data.total_fee || result.data.fee?.total || 0),
      rawStatus: "ready_to_pick",
    };
  }

  return { provider, configured, createShipment };
}

function mapGhnStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["ready_to_pick", "picking", "money_collect_picking", "picked"].includes(value)) return "ready_to_ship";
  if (["storing", "transporting", "sorting", "delivering", "money_collect_delivering"].includes(value)) return "shipping";
  if (value === "delivered") return "delivered";
  if (["delivery_fail", "waiting_to_return", "return", "return_transporting", "return_sorting", "returning"].includes(value)) return "delivery_failed";
  if (["cancel", "returned", "exception", "damage", "lost"].includes(value)) return "cancelled";
  return null;
}

module.exports = { createShippingService, mapGhnStatus };
