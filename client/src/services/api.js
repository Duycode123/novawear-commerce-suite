const defaultBase = window.location.hostname === "localhost"
  ? "http://localhost:5000/api"
  : "/api";

const configuredBase = String(process.env.REACT_APP_API_URL || "").trim();
export const API_BASE = (configuredBase || defaultBase).replace(/\/$/, "");
const publicGetCache = new Map();
const CACHEABLE_PUBLIC_PATH = /^\/(products(?:\?|\/)|categories(?:\?|$)|news(?:\?|\/|$)|promotions(?:\?|\/|$)|config(?:\?|$))/;

function apiConnectionMessage() {
  if (process.env.NODE_ENV === "production" && API_BASE === "/api") {
    return "API chưa được nối với bản giao diện online. Hãy cấu hình REACT_APP_API_URL trỏ tới địa chỉ Render rồi build lại giao diện.";
  }
  return "Không thể kết nối máy chủ. Vui lòng thử lại sau.";
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem("novawear_token");
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    Accept: "application/json",
    ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: options.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(apiConnectionMessage(), 0, { code: "API_UNREACHABLE" });
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    // A static Vercel fallback returns index.html with status 200 when /api
    // was not wired to Render. Treat that as a failed API call instead of
    // letting callers read result.user from an HTML response.
    await response.text();
    throw new ApiError(
      response.ok ? apiConnectionMessage() : "Máy chủ API trả về phản hồi không hợp lệ.",
      response.status || 502,
      { code: "API_RESPONSE_INVALID", contentType },
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch (_error) {
    throw new ApiError("Máy chủ API trả về dữ liệu không hợp lệ.", response.status || 502, {
      code: "API_RESPONSE_INVALID",
    });
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      sessionStorage.removeItem("novawear_token");
      sessionStorage.removeItem("novawear_user");
      window.dispatchEvent(new Event("novawear:session-expired"));
    }
    throw new ApiError(payload.message || "Yêu cầu chưa thể hoàn tất.", response.status, payload);
  }
  return payload;
}

function cachedPublicGet(path, options = {}) {
  const { cache: cacheOption, ...requestOptions } = options;
  if (!CACHEABLE_PUBLIC_PATH.test(path) || options.signal || cacheOption === false) {
    return apiRequest(path, { ...requestOptions, method: "GET" });
  }
  const now = Date.now();
  const cached = publicGetCache.get(path);
  if (cached && cached.expiresAt > now) return cached.promise;
  const promise = apiRequest(path, { ...requestOptions, method: "GET" })
    .catch((error) => {
      publicGetCache.delete(path);
      throw error;
    });
  publicGetCache.set(path, { promise, expiresAt: now + 30_000 });
  return promise;
}

export const api = {
  get: cachedPublicGet,
  post: (path, body, options) => apiRequest(path, { ...options, method: "POST", body: JSON.stringify(body) }),
  put: (path, body, options) => apiRequest(path, { ...options, method: "PUT", body: JSON.stringify(body) }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  delete: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
  upload: (path, file, options) => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest(path, { ...options, method: "POST", body });
  },
};
