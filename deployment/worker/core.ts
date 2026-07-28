import seedTemplate from "./seed-data.json";
import type { Env, State, User } from "./types";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Đã tiếp nhận",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  shipping: "Đang giao hàng",
  delivered: "Giao thành công",
  cancelled: "Đã hủy",
};

export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packing", "cancelled"],
  packing: ["shipping", "cancelled"],
  shipping: ["delivered"],
  delivered: [],
  cancelled: [],
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function hashPassword(password: string): Promise<string> {
  const iterations = 120000;
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    256,
  );
  return `pbkdf2$${iterations}$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [scheme, iterationText, saltText, hashText] = String(encoded || "").split("$");
  if (scheme !== "pbkdf2" || !iterationText || !saltText || !hashText) return false;
  const iterations = Number(iterationText);
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: base64UrlToBytes(saltText).buffer as ArrayBuffer, iterations },
    material,
    256,
  );
  const expected = base64UrlToBytes(hashText);
  const actual = new Uint8Array(bits);
  if (expected.length !== actual.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ actual[index];
  return difference === 0;
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createToken(user: User, secret: string): Promise<string> {
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
  })));
  const signature = await sign(`${header}.${payload}`, secret);
  return `${header}.${payload}.${signature}`;
}

async function verifyToken(token: string, secret: string): Promise<Record<string, any> | null> {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;
  const expected = await sign(`${header}.${payload}`, secret);
  if (expected.length !== signature.length) return null;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  if (difference !== 0) return null;
  try {
    const parsed = JSON.parse(decoder.decode(base64UrlToBytes(payload)));
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function initialState(): Promise<State> {
  const state = JSON.parse(JSON.stringify(seedTemplate)) as State;
  const demoPasswords: Record<string, string> = {
    "admin@novawear.vn": "Admin@123",
    "staff@novawear.vn": "Staff@123",
    "demo@novawear.vn": "Demo@123",
  };
  for (const user of state.users) {
    user.passwordHash = await hashPassword(demoPasswords[user.email] || randomToken(24));
  }
  state.meta = {
    ...state.meta,
    jwtSecret: randomToken(48),
    initializedAt: new Date().toISOString(),
  };
  for (const collection of ["categories", "products", "users", "customers", "employees", "orders", "purchaseOrders", "attendance", "tasks", "reviews", "coupons", "contacts", "subscribers", "auditLogs"]) {
    if (!Array.isArray(state[collection])) state[collection] = [];
  }
  return state;
}

export async function loadState(env: Env): Promise<State> {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL)",
  ).run();
  const row = await env.DB.prepare("SELECT data FROM app_state WHERE id = ?")
    .bind("main")
    .first<{ data: string }>();
  if (row?.data) return JSON.parse(row.data);

  const state = await initialState();
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO app_state (id, data, updated_at) VALUES (?, ?, ?)")
    .bind("main", JSON.stringify(state), now)
    .run();
  return state;
}

export async function saveState(env: Env, state: State): Promise<void> {
  state.meta.updatedAt = new Date().toISOString();
  await env.DB.prepare("UPDATE app_state SET data = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(state), state.meta.updatedAt, "main")
    .run();
}

export function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
    },
  });
}

export function fail(status: number, message: string): Response {
  return json({ message }, status);
}

export async function readBody(request: Request): Promise<Record<string, any>> {
  try {
    return (await request.json()) as Record<string, any>;
  } catch {
    return {};
  }
}

export function normalizeText(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function slugify(value: unknown): string {
  return normalizeText(value)
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function asMoney(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

export function asPositiveInt(value: unknown, fallback = 1): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function nextId(prefix: string): string {
  return `${prefix}${crypto.randomUUID().slice(0, 8)}`;
}

export function sanitizeUser(user: User): User {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export function publicProduct(product: Record<string, any>, categories: Record<string, any>[]): Record<string, any> {
  const { cost: _cost, ...safe } = product;
  return {
    ...safe,
    category: categories.find((item) => item.id === product.categoryId) || null,
  };
}

export function audit(state: State, action: string, entity: string, entityId: string, user?: User | null): void {
  state.auditLogs.unshift({
    id: nextId("log-"),
    action,
    entity,
    entityId,
    userId: user?.id || null,
    userName: user?.name || "System",
    createdAt: new Date().toISOString(),
  });
  state.auditLogs = state.auditLogs.slice(0, 500);
}

export async function currentUser(request: Request, state: State): Promise<User | null> {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const payload = await verifyToken(authorization.slice(7), state.meta.jwtSecret);
  if (!payload) return null;
  const user = state.users.find((item: User) => item.id === payload.sub);
  return user?.status === "active" ? user : null;
}

export function allowed(user: User | null, roles: string[]): user is User {
  return Boolean(user && roles.includes(user.role));
}
