const V2_TRANSACTIONS_URL = "https://userapi.sepay.vn/v2/transactions";
const V1_TRANSACTIONS_URL = "https://my.sepay.vn/userapi/transactions/list";

function configured(value) {
  const text = String(value || "").trim();
  return Boolean(text && !/replace-with|your-|example/i.test(text));
}

function normalizePaymentCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function asAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

function vietnamDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(safeDate);
  const values = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function transactionList(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.transactions)) return payload.transactions;
  return [];
}

function transactionDate(value) {
  const text = String(value || "").trim();
  if (!text) return new Date().toISOString();
  const parsed = new Date(text.includes("T") ? text : `${text.replace(" ", "T")}+07:00`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function findMatchingTransaction(items, query) {
  const expectedAmount = asAmount(query.amount);
  const expectedReference = normalizePaymentCode(query.reference);
  const expectedAccount = String(query.accountNumber || "").replace(/\s+/g, "");
  if (!expectedAmount || !expectedReference) return null;

  for (const item of items) {
    const transferType = String(item.transfer_type || item.transferType || "in").toLowerCase();
    if (transferType && transferType !== "in") continue;

    const amount = asAmount(item.amount_in ?? item.transferAmount ?? item.amountIn);
    if (amount < expectedAmount) continue;

    const accountNumber = String(
      item.account_number || item.accountNumber || "",
    ).replace(/\s+/g, "");
    if (expectedAccount && accountNumber && expectedAccount !== accountNumber) continue;

    const code = String(item.code || "");
    const content = String(
      item.transaction_content || item.content || item.description || "",
    );
    const searchable = normalizePaymentCode(`${code} ${content}`);
    if (!searchable.includes(expectedReference)) continue;

    const id = String(item.id || item.reference_code || item.referenceCode || "").trim();
    if (!id) continue;

    return {
      id,
      gateway: String(item.bank_brand_name || item.gateway || ""),
      accountNumber,
      referenceCode: String(item.reference_code || item.referenceCode || ""),
      transferAmount: amount,
      code,
      content: content.slice(0, 500),
      receivedAt: transactionDate(item.transaction_date || item.transactionDate),
      source: "sepay-api",
    };
  }
  return null;
}

async function requestTransactions(fetchImpl, url, accessToken) {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`SePay API returned ${response.status}`);
  }
  return transactionList(await response.json());
}

function createSepayTransactionLookup(options = {}) {
  const accessToken = String(
    options.accessToken || process.env.SEPAY_API_ACCESS_TOKEN || "",
  ).trim();
  const accountNumber = String(
    options.accountNumber
      || process.env.SEPAY_API_ACCOUNT_NUMBER
      || process.env.SEPAY_QR_BANK_ACCOUNT
      || "",
  ).trim();
  const fetchImpl = options.fetchImpl || global.fetch;
  const isConfigured = configured(accessToken) && configured(accountNumber)
    && typeof fetchImpl === "function";

  return {
    configured: isConfigured,
    async findIncomingPayment(query) {
      if (!isConfigured) return null;
      const fromDate = vietnamDate(query.createdAt || new Date());
      const toDate = vietnamDate(new Date());
      const amount = asAmount(query.amount);
      const reference = normalizePaymentCode(query.reference);
      if (!amount || !reference) return null;

      const v2 = new URL(V2_TRANSACTIONS_URL);
      v2.searchParams.set("q", reference);
      v2.searchParams.set("transfer_type", "in");
      v2.searchParams.set("transaction_date_from", `${fromDate} 00:00:00`);
      v2.searchParams.set("transaction_date_to", `${toDate} 23:59:59`);
      v2.searchParams.set("amount_in_min", String(amount));
      v2.searchParams.set("amount_in_max", String(amount));
      v2.searchParams.set("per_page", "20");

      try {
        const items = await requestTransactions(fetchImpl, v2, accessToken);
        const match = findMatchingTransaction(items, {
          ...query,
          accountNumber,
        });
        if (match) return match;
      } catch (_error) {
        // Fall back to SePay's legacy endpoint below.
      }

      const v1 = new URL(V1_TRANSACTIONS_URL);
      v1.searchParams.set("account_number", accountNumber);
      v1.searchParams.set("amount_in", String(amount));
      v1.searchParams.set("transaction_date_min", fromDate);
      v1.searchParams.set("transaction_date_max", toDate);
      v1.searchParams.set("limit", "20");

      try {
        const items = await requestTransactions(fetchImpl, v1, accessToken);
        return findMatchingTransaction(items, {
          ...query,
          accountNumber,
        });
      } catch (_error) {
        return null;
      }
    },
  };
}

module.exports = {
  createSepayTransactionLookup,
  findMatchingTransaction,
  normalizePaymentCode,
};
